# stdlib imports
import json

from django.utils.translation import gettext_lazy as _
from rest_framework.renderers import JSONRenderer

# rest_framework imports
from rest_framework.status import is_success


def manage_error_list(errors):
    for key, value in errors.items():
        if isinstance(value, list):
            yield value[0]
            # return
        else:
            yield value


# manager errors
def manage_error(errors, temp_list=[]):
    """get error and append in list

    Args:
        errors (dict): errors
        temp_list (list, optional): list empty. Defaults to [].

    Returns:
        temp_list_2 (list | []): list of errors
    """
    temp_list_2 = []
    for key, value in errors.items():
        if isinstance(value, dict):
            temp_list.append(
                {"detail": default_format(message=manage_error_list(value))}
            )
            temp_list_2 = temp_list

        elif isinstance(value, list):
            temp_list_2.append({"detail": default_format(message=value)})

        else:
            temp_list_2.append({"detail": default_format(message=value)})
    return temp_list_2


# manage list error
def handel_list_error(key, errors: list):
    """
    if error is type list use function
    """
    return {"detail": default_format(message=errors)}


def handel_list_one_item_error(key, errors: list):
    """
    if error is type list but one item use function
    """
    return {"detail": default_format(message=errors[0])}


# manage json error
def handel_json_error(key, errors: dict):
    """
    if error is type dict use function
    """
    return {"detail": default_format(message=errors)}


def handel_str_error(error):
    return {"detail": default_format(message=error)}


def handel_dict_message(errors):
    """
    Handle error dictionary and convert to messages format.
    
    Returns:
        dict: Dictionary with error messages, e.g., {"non_field_errors": [...]} or {"field_name": [...]}
    """
    # If it's already a validation error dict (has field names as keys)
    # like {'non_field_errors': [...]} or {'username': [...]}
    if isinstance(errors, dict):
        # Check if it has validation error structure (list values or dict values)
        if any(isinstance(v, (list, dict)) for v in errors.values()):
            return errors
        
        # If it has "detail" key
        if "detail" in errors:
            detail = errors["detail"]
            if isinstance(detail, dict):
                return detail
            if isinstance(detail, str):
                return {"non_field_errors": [detail]}
            if isinstance(detail, list):
                return {"non_field_errors": detail}
        
        # If it's a simple dict with string values, convert to non_field_errors
        if all(isinstance(v, str) for v in errors.values()):
            return {"non_field_errors": list(errors.values())}
    
    # Return as is if it's already in the right format
    return errors


def default_format(message=None, child=None):
    """format error message
    Returns:
        dict:  structure message
    """
    data = {"message": message, "child": child}
    return data


def handel_error_import(errors):
    lst = []
    if "detail" in errors:
        if isinstance(errors["detail"], list):
            for item in errors["detail"]:
                lst.append(item)
            return {"non_field_errors": lst}
        return {"non_field_errors": [errors["detail"]]}
    return errors


# return custom json render
class CustomJSONRenderer(JSONRenderer):
    """custom json renderer

    Returns:
        result (list | [])
        status (int)
        success (str)
        messages (list)
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        rendered = json.loads(
            super().render(data or [], accepted_media_type, renderer_context)
        )
        response = renderer_context["response"]
        errors = []
        error_list = []

        if not is_success(response.status_code):
            if isinstance(rendered, dict):
                errors = handel_dict_message(rendered)
            elif isinstance(rendered, list) and len(rendered) == 1:
                errors = [handel_list_one_item_error(key="errors", errors=rendered)]
            elif isinstance(rendered, list):
                errors = [handel_list_error(key="errors", errors=rendered)]
            elif isinstance(rendered, str):
                errors = [handel_str_error(rendered)]
            else:
                errors = manage_error(rendered, error_list)

        response_data = {
            "result": rendered if is_success(response.status_code) else [],
            "status": response.status_code,
            "success": is_success(response.status_code),
            "messages": {"success": [_("عملیات با موفقیت انجام شد")]}
            if is_success(response.status_code)
            else errors,
        }

        response = super().render(response_data, accepted_media_type, renderer_context)
        if response_data["status"] == 500:
            print(response_data)
        return response


class ImportJSONRenderer(JSONRenderer):
    """custom json renderer

    Returns:
        result (list | [])
        status (int)
        success (str)
        messages (list)
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        rendered = json.loads(
            super().render(data or [], accepted_media_type, renderer_context)
        )
        response = renderer_context["response"]
        errors = []
        error_list = []
        if not is_success(response.status_code):
            if isinstance(rendered, dict):
                errors = handel_error_import(rendered)
            elif isinstance(rendered, list) and len(rendered) == 1:
                errors = [handel_list_one_item_error(key="errors", errors=rendered)]
            elif isinstance(rendered, list):
                errors = [handel_list_error(key="errors", errors=rendered)]
            elif isinstance(rendered, str):
                errors = [handel_str_error(rendered)]
            else:
                errors = manage_error(rendered, error_list)
        try:
            if "detail" in errors:
                errors[0]["detail"]["message"][0]["row_number"]
                row_failed = True
            elif "failed" in errors:
                row_failed = True
            else:
                row_failed = False
        except Exception:
            row_failed = False

        result = []
        if row_failed:
            if "failed" in errors:
                result = errors
            elif isinstance(errors, list) and "detail" in errors[0]:
                result = result.append({"failed": errors[0]["detail"]["message"]})
            elif isinstance(errors, dict) and "detail" in errors:
                result = result.append({"failed": errors["detail"]["message"]})

        response_data = {
            "result": result,
            "status": response.status_code,
            "success": is_success(response.status_code),
            "messages": {"non_field_errors": [(_("بارگذاری با موفقیت انجام نشد"))]}
            if row_failed
            else [
                _("بارگذاری با موفقیت انجام شد")
                if is_success(response.status_code)
                else errors
            ],
        }

        response = super().render(response_data, accepted_media_type, renderer_context)
        if response_data["status"] == 500:
            print(response_data)
        return response
