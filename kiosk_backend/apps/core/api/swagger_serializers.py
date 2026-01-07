from rest_framework import serializers


class MessagesFieldOutputSwaggerSerializer(serializers.DictField):
    """
    Reusable field for messages in swagger serializers.
    """

    def __init__(self, **kwargs):
        super().__init__(
            child=serializers.ListField(child=serializers.CharField()),
            help_text="Dictionary of message types mapped to lists of messages.",
            **kwargs,
        )


class BaseOutputSwaggerSerializer(serializers.Serializer):
    """
    Base serializer for standard API responses.
    Suitable for endpoints that return a single object (e.g., detail views or create/update operations).
    """

    result = serializers.JSONField(
        help_text="The main response payload (object or data)."
    )
    status = serializers.IntegerField(help_text="HTTP status code (e.g., 200, 400).")
    success = serializers.BooleanField(
        help_text="Indicates if the request was successful. True if the request was successful."
    )
    messages = MessagesFieldOutputSwaggerSerializer()


class ListPaginatedResultOutputSwaggerSerializer(serializers.Serializer):
    """
    Serializer for paginated data structures in API responses.
    """

    count = serializers.IntegerField(help_text="Total number of available items.")
    next = serializers.CharField(
        allow_null=True,
        help_text="URL to the next page of results (if available).",
        default=None,
    )
    previous = serializers.CharField(
        allow_null=True,
        help_text="URL to the previous page of results (if available)",
        default=None,
    )
    page_size = serializers.IntegerField(help_text="Number of items per page.")
    results = serializers.ListField(
        child=serializers.DictField(), help_text="List of items for the current page."
    )


class ListPaginatedOutputSwaggerSerializer(BaseOutputSwaggerSerializer):
    """
    API response serializer for paginated lists.
    """

    result = ListPaginatedResultOutputSwaggerSerializer()


class ListAllOutputSwaggerSerializer(BaseOutputSwaggerSerializer):
    """
    API response serializer for non-paginated list results.
    """

    result = serializers.ListField(
        child=serializers.DictField(), help_text="List of returned objects."
    )
