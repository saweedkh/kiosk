from functools import lru_cache
from typing import Type, Union, List, Optional

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status

from apps.core.api.swagger_serializers import (
    BaseOutputSwaggerSerializer,
    ListAllOutputSwaggerSerializer,
    ListPaginatedOutputSwaggerSerializer,
    ListPaginatedResultOutputSwaggerSerializer,
)


class ResponseStatusCodes:
    """
    HTTP status codes and custom status strings used for response schemas.
    Supports DRF status codes as well as special cases for paginated/unpaginated responses.
    """

    OK_ALL = f"{status.HTTP_200_OK}-all"  # Custom for unpaginated lists
    OK_PAGINATED = f"{status.HTTP_200_OK}-paginated"  # Custom for paginated lists
    OK = status.HTTP_200_OK
    CREATED = status.HTTP_201_CREATED
    BAD_REQUEST = status.HTTP_400_BAD_REQUEST
    UNAUTHORIZED = status.HTTP_401_UNAUTHORIZED
    FORBIDDEN = status.HTTP_403_FORBIDDEN
    NOT_FOUND = status.HTTP_404_NOT_FOUND
    CONFLICT = status.HTTP_409_CONFLICT
    SERVER_ERROR = status.HTTP_500_INTERNAL_SERVER_ERROR
    NO_CONTENT = status.HTTP_204_NO_CONTENT


@lru_cache(maxsize=None)
def build_swagger_response_serializer(
    response_serializer: Type[serializers.Serializer],
    resource_name: str,
    status_code: Union[int, str],
) -> Type[serializers.Serializer]:
    """
    Dynamically builds and caches standardized DRF serializer classes for Swagger documentation.
    These serializers wrap the actual response payload inside a unified response envelope
    according to the API convention.

    Args:
        response_serializer (Type[Serializer]): Serializer class for the actual 'result' field.
        resource_name (str): Base name used for generated serializer class and Swagger ref name.
        status_code (Union[int, str]): HTTP status code or custom string like '200-paginated'.

    Returns:
        Type[Serializer]: A dynamically generated serializer class.
    """

    # 1. Paginated response (200-paginated)
    if status_code == ResponseStatusCodes.OK_PAGINATED:

        class PaginatedResultSerializer(ListPaginatedResultOutputSwaggerSerializer):
            results = response_serializer(many=True)

            class Meta:
                ref_name = f"{resource_name}PaginatedResult"

        class PaginatedWrapperSerializer(ListPaginatedOutputSwaggerSerializer):
            result = PaginatedResultSerializer()

            class Meta:
                ref_name = f"{resource_name}ListPaginatedSwaggerSerializer"

            __doc__ = f"Paginated list response for `{resource_name}`."

        return PaginatedWrapperSerializer

    # 2. Unpaginated response (200-all)
    if status_code == ResponseStatusCodes.OK_ALL:

        class UnpaginatedListSerializer(ListAllOutputSwaggerSerializer):
            result = serializers.ListField(
                child=response_serializer(), help_text="List of objects."
            )

            class Meta:
                ref_name = f"{resource_name}ListAllOutputSwaggerSerializer"

            __doc__ = f"Unpaginated list response for `{resource_name}`."

        return UnpaginatedListSerializer

    # 3. Standard single object response (200 or 201)
    if status_code in (ResponseStatusCodes.OK, ResponseStatusCodes.CREATED):

        class StandardResponseSerializer(BaseOutputSwaggerSerializer):
            result = response_serializer()

            class Meta:
                ref_name = f"{resource_name}SwaggerSerializer"

            __doc__ = f"Standard success response for `{resource_name}`."

        return StandardResponseSerializer

    # 4. No Content response (204)
    if status_code == ResponseStatusCodes.NO_CONTENT:
        # 204 No Content doesn't have a response body
        return None

    # 5. Error response (any 4xx or 5xx)
    if isinstance(status_code, int) and status_code >= 400:

        class ErrorResponseSerializer(serializers.Serializer):
            result = serializers.ListField(
                child=serializers.DictField(),
                default=[],
                help_text="Empty list for error responses.",
            )
            status = serializers.IntegerField(
                default=status_code, help_text="HTTP status code."
            )
            success = serializers.BooleanField(
                default=False, help_text="Indicates failure (always false)."
            )
            messages = serializers.DictField(
                child=serializers.ListField(child=serializers.CharField()),
                help_text="Error messages grouped by field.",
            )

            class Meta:
                ref_name = f"{resource_name}ErrorSwaggerSerializer_{status_code}"

            __doc__ = f"Error response for `{resource_name}` with HTTP {status_code}."

        return ErrorResponseSerializer

    # 6. Fallback
    raise ValueError(f"Unsupported status code: {status_code}")


def custom_extend_schema(
    *,
    response_serializer: Optional[Type[serializers.Serializer]] = None,
    resource_name: Optional[str] = None,
    status_codes: Optional[List[Union[int, str]]] = None,
    
    **other_kwargs,
):
    """
    Decorator wrapper over `extend_schema` that dynamically builds response serializers
    using your standardized envelope structure. Supports multiple status codes automatically.

    Args:
        response_serializer (Type[Serializer], optional): Base serializer for 'result' field.
        resource_name (str, optional): Base name for generated serializers and Swagger refs.
        status_codes (List[Union[int, str]], optional): List of HTTP or custom status codes.
        **other_kwargs: Any additional keyword arguments passed to `extend_schema`.

    Returns:
        Callable: A decorator usable on DRF views/viewsets.
    """
    # Handle parameters: if it contains serializer classes (not OpenApiParameter), 
    # check if they should be request body or query parameters
    if 'parameters' in other_kwargs:
        parameters = other_kwargs.pop('parameters')
        if parameters:
            # Check if parameters are serializer classes (likely request body)
            # vs OpenApiParameter objects (query/path parameters)
            request_serializers = []
            query_path_params = []
            
            for param in parameters:
                if isinstance(param, type) and issubclass(param, serializers.Serializer):
                    # This is likely a request body serializer, not a query parameter
                    # For POST/PUT/PATCH, use 'request' instead of 'parameters'
                    request_serializers.append(param)
                else:
                    # This is an OpenApiParameter or other valid parameter
                    query_path_params.append(param)
            
            # If we have request serializers and no 'request' already set, use the first one
            if request_serializers and 'request' not in other_kwargs:
                other_kwargs['request'] = request_serializers[0] if len(request_serializers) == 1 else request_serializers
            
            # Add remaining query/path parameters back
            if query_path_params:
                other_kwargs['parameters'] = query_path_params
    
    if not (response_serializer and resource_name and status_codes):
        return extend_schema(**other_kwargs)

    responses = {}

    for code in status_codes:
        serializer_cls = build_swagger_response_serializer(
            response_serializer=response_serializer,
            resource_name=resource_name,
            status_code=code,
        )

        # Human-readable response description
        if code == ResponseStatusCodes.OK_PAGINATED:
            description = "Paginated list response"
        elif code == ResponseStatusCodes.OK_ALL:
            description = "Unpaginated list response"
        elif code in (ResponseStatusCodes.OK, ResponseStatusCodes.CREATED):
            description = "Successful response"
        elif code == ResponseStatusCodes.NO_CONTENT:
            description = "No content"
            # 204 No Content doesn't have a response body
            responses[code] = OpenApiResponse(description=description)
            continue
        elif isinstance(code, int) and code >= 400:
            description = f"Error response ({code})"
        else:
            description = "Response"

        if serializer_cls:
            responses[code] = OpenApiResponse(
                response=serializer_cls, description=description
            )

    return extend_schema(responses=responses, **other_kwargs)
