from typing import Any, Dict, Optional

from apps.bale_bot.models import BaleBotSettings
from apps.logs.services.log_service import LogService


class BaleConfigService:
    @staticmethod
    def get_settings() -> BaleBotSettings:
        return BaleBotSettings.get_solo()

    @staticmethod
    def serialize(settings_obj: Optional[BaleBotSettings] = None) -> Dict[str, Any]:
        obj = settings_obj or BaleBotSettings.get_solo()
        token = obj.resolve_token()
        masked = ''
        if obj.bot_token:
            masked = obj.mask_token()
        elif token:
            masked = f'{token[:6]}…{token[-4:]}' if len(token) > 10 else ('*' * len(token))
        return {
            'is_enabled': obj.is_enabled,
            'has_token': bool(token),
            'token_masked': masked,
            'api_base': obj.resolve_api_base(),
            'is_runtime_active': obj.is_runtime_active(),
            'updated_at': obj.updated_at.isoformat() if obj.updated_at else None,
        }

    @staticmethod
    def update(
        *,
        is_enabled: Optional[bool] = None,
        bot_token: Optional[str] = None,
        api_base: Optional[str] = None,
        clear_token: bool = False,
        actor=None,
        validate_token: bool = True,
    ) -> BaleBotSettings:
        obj = BaleBotSettings.get_solo()
        if is_enabled is not None:
            obj.is_enabled = bool(is_enabled)
        if clear_token:
            obj.bot_token = ''
        elif bot_token is not None:
            cleaned = bot_token.strip()
            if cleaned:
                if validate_token:
                    BaleConfigService._validate_token(cleaned, api_base or obj.resolve_api_base())
                obj.bot_token = cleaned
        if api_base is not None:
            cleaned_base = api_base.strip()
            if cleaned_base:
                obj.api_base = cleaned_base.rstrip('/')
        obj.save()
        LogService.log_info(
            'admin',
            'bale_bot_settings_updated',
            user=actor,
            details={
                'is_enabled': obj.is_enabled,
                'has_token': bool(obj.resolve_token()),
                'is_runtime_active': obj.is_runtime_active(),
            },
        )
        return obj

    @staticmethod
    def _validate_token(token: str, api_base: str) -> None:
        from apps.bale_bot.client import BaleClient

        client = BaleClient(token=token, api_base=api_base)
        try:
            client.get_me()
        except Exception as exc:
            raise ValueError(f'توکن معتبر نیست یا به API بله دسترسی نیست: {exc}') from exc
