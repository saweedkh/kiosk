import logging
from typing import Any, Dict, List, Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class BaleClient:
    """Thin HTTP client for Bale Bot API (Telegram-compatible)."""

    def __init__(self, token: Optional[str] = None, api_base: Optional[str] = None):
        resolved_token = token
        resolved_base = api_base
        if resolved_token is None or resolved_base is None:
            try:
                from apps.bale_bot.models import BaleBotSettings

                cfg = BaleBotSettings.get_solo()
                if resolved_token is None:
                    resolved_token = cfg.resolve_token()
                if resolved_base is None:
                    resolved_base = cfg.resolve_api_base()
            except Exception:
                resolved_token = resolved_token or getattr(settings, 'BALE_BOT_TOKEN', '') or ''
                resolved_base = resolved_base or getattr(settings, 'BALE_API_BASE', 'https://tapi.bale.ai')

        self.token = (resolved_token or '').strip()
        self.api_base = (resolved_base or 'https://tapi.bale.ai').rstrip('/')

    @classmethod
    def from_settings(cls) -> 'BaleClient':
        return cls()

    @property
    def configured(self) -> bool:
        return bool(self.token)

    @property
    def enabled(self) -> bool:
        """Backward-compatible: token present. Prefer is_runtime_active() for polling."""
        return self.configured

    def refresh_credentials(self) -> None:
        """Reload token/api_base from DB (panel changes take effect without restart)."""
        try:
            from apps.bale_bot.models import BaleBotSettings

            cfg = BaleBotSettings.get_solo()
            self.token = cfg.resolve_token()
            self.api_base = cfg.resolve_api_base()
        except Exception:
            logger.exception('Failed to refresh Bale credentials')

    def _url(self, method: str) -> str:
        return f'{self.api_base}/bot{self.token}/{method}'

    def call(self, method: str, payload: Optional[Dict[str, Any]] = None, timeout: int = 35) -> Dict[str, Any]:
        if not self.configured:
            raise RuntimeError('توکن ربات بله تنظیم نشده است')
        response = requests.post(self._url(method), json=payload or {}, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        if not data.get('ok'):
            raise RuntimeError(data.get('description') or f'Bale API error on {method}')
        return data.get('result')

    def get_updates(self, offset: Optional[int] = None, timeout: int = 30, limit: int = 50) -> List[Dict[str, Any]]:
        payload: Dict[str, Any] = {'timeout': timeout, 'limit': limit}
        if offset is not None:
            payload['offset'] = offset
        result = self.call('getUpdates', payload, timeout=timeout + 10)
        return result or []

    def send_message(
        self,
        chat_id: str | int,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            'chat_id': chat_id,
            'text': text,
        }
        if reply_markup:
            payload['reply_markup'] = reply_markup
        if parse_mode:
            payload['parse_mode'] = parse_mode
        return self.call('sendMessage', payload)

    def answer_callback_query(self, callback_query_id: str, text: Optional[str] = None) -> Any:
        payload: Dict[str, Any] = {'callback_query_id': callback_query_id}
        if text:
            payload['text'] = text
        return self.call('answerCallbackQuery', payload)

    def edit_message_text(
        self,
        chat_id: str | int,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
    ) -> Any:
        payload: Dict[str, Any] = {
            'chat_id': chat_id,
            'message_id': message_id,
            'text': text,
        }
        if reply_markup:
            payload['reply_markup'] = reply_markup
        return self.call('editMessageText', payload)

    def get_me(self) -> Dict[str, Any]:
        return self.call('getMe', {})

    def get_file(self, file_id: str) -> Dict[str, Any]:
        return self.call('getFile', {'file_id': file_id})

    def download_file(self, file_id: str, timeout: int = 60) -> tuple[bytes, str]:
        """
        Download a file from Bale by file_id.
        Returns (content_bytes, suggested_filename).
        """
        info = self.get_file(file_id) or {}
        file_path = info.get('file_path') or ''
        if not file_path:
            raise RuntimeError('مسیر فایل از بله دریافت نشد')

        # Prefer path from API; fall back to common Telegram-style URL
        if str(file_path).startswith('http'):
            url = file_path
        else:
            url = f'{self.api_base}/file/bot{self.token}/{file_path.lstrip("/")}'

        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        name = file_path.split('/')[-1] or f'{file_id}.jpg'
        return response.content, name
