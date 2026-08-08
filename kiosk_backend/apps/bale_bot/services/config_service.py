from typing import Any, Dict, Optional

from django.utils import timezone

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
            'env_enabled': obj.is_env_enabled(),
            'has_token': bool(token),
            'token_masked': masked,
            'api_base': obj.resolve_api_base(),
            'is_runtime_active': obj.is_runtime_active(),
            'last_poll_at': obj.last_poll_at.isoformat() if obj.last_poll_at else None,
            'last_poll_error': obj.last_poll_error or '',
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

    @staticmethod
    def mark_poll_success() -> None:
        BaleBotSettings.objects.filter(pk=1).update(
            last_poll_at=timezone.now(),
            last_poll_error='',
        )

    @staticmethod
    def mark_poll_error(message: str) -> None:
        BaleBotSettings.objects.filter(pk=1).update(
            last_poll_error=(message or '')[:500],
        )

    @staticmethod
    def check_health() -> Dict[str, Any]:
        """Live health probe: config flags + getMe latency + worker poll freshness."""
        import time

        from apps.bale_bot.client import BaleClient

        obj = BaleBotSettings.get_solo()
        token = obj.resolve_token()
        api_base = obj.resolve_api_base()
        now = timezone.now()

        result: Dict[str, Any] = {
            'checked_at': now.isoformat(),
            'is_enabled': obj.is_enabled,
            'env_enabled': obj.is_env_enabled(),
            'has_token': bool(token),
            'is_runtime_active': obj.is_runtime_active(),
            'api_base': api_base,
            'api_ok': False,
            'latency_ms': None,
            'bot_id': None,
            'bot_username': None,
            'bot_name': None,
            'worker_ok': False,
            'last_poll_at': obj.last_poll_at.isoformat() if obj.last_poll_at else None,
            'last_poll_age_seconds': None,
            'last_poll_error': obj.last_poll_error or '',
            'status': 'down',
            'message': '',
        }

        if not obj.is_env_enabled():
            result['status'] = 'env_disabled'
            result['message'] = (
                'ربات از طریق متغیر محیطی BALE_BOT_ENABLED خاموش است؛ '
                'سرویس polling اجرا نمی‌شود.'
            )
            return result

        if not token:
            result['status'] = 'misconfigured'
            result['message'] = 'توکن ربات تنظیم نشده است.'
            return result

        client = BaleClient(token=token, api_base=api_base)
        started = time.monotonic()
        try:
            me = client.get_me() or {}
            latency = int((time.monotonic() - started) * 1000)
            result['api_ok'] = True
            result['latency_ms'] = latency
            result['bot_id'] = me.get('id')
            result['bot_username'] = me.get('username')
            result['bot_name'] = me.get('first_name') or me.get('username')
        except Exception as exc:
            result['api_ok'] = False
            result['latency_ms'] = int((time.monotonic() - started) * 1000)
            result['status'] = 'down'
            result['message'] = f'اتصال به API بله برقرار نشد: {exc}'
            return result

        if obj.last_poll_at:
            age = max(0, int((now - obj.last_poll_at).total_seconds()))
            result['last_poll_age_seconds'] = age
            result['worker_ok'] = age <= 120
        else:
            result['worker_ok'] = False

        if not obj.is_enabled:
            result['status'] = 'disabled'
            result['message'] = (
                f'API وصل است (@{result["bot_username"] or "bot"}) ولی ربات در پنل خاموش است.'
            )
            return result

        if result['worker_ok']:
            result['status'] = 'ok'
            result['message'] = (
                f'اتصال سالم — @{result["bot_username"] or "bot"} '
                f'({result["latency_ms"]}ms) · worker فعال'
            )
        else:
            result['status'] = 'degraded'
            if obj.last_poll_error:
                result['message'] = (
                    f'API وصل است ولی worker مشکل دارد: {obj.last_poll_error}'
                )
            elif not obj.last_poll_at:
                result['message'] = (
                    'API وصل است ولی هنوز polling موفقی ثبت نشده. سرویس bale_bot را چک کنید.'
                )
            else:
                age = result['last_poll_age_seconds']
                result['message'] = (
                    f'API وصل است ولی آخرین poll حدود {age} ثانیه پیش بوده. '
                    'احتمالاً سرویس polling متوقف شده.'
                )
        return result
