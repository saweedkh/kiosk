from typing import Any
from rest_framework import serializers
from apps.logs.services.log_service import LogService


class LoggingMixin:
    """
    Mixin for automatic logging of CRUD operations in ViewSets.
    
    This mixin automatically logs create, update, and delete operations
    with user and instance information.
    """
    
    def perform_create(self, serializer: serializers.Serializer) -> Any:
        """
        Override perform_create to log creation operation.
        
        Args:
            serializer: DRF serializer instance
            
        Returns:
            Any: Created instance
        """
        instance = serializer.save()
        LogService.log_info(
            log_type='admin_action',
            action=f'{self.__class__.__name__}_create',
            user=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
            details={'instance_id': instance.id, 'model': instance.__class__.__name__}
        )
        return instance
    
    def perform_update(self, serializer: serializers.Serializer) -> Any:
        """
        Override perform_update to log update operation.
        
        Args:
            serializer: DRF serializer instance
            
        Returns:
            Any: Updated instance
        """
        instance = serializer.save()
        LogService.log_info(
            log_type='admin_action',
            action=f'{self.__class__.__name__}_update',
            user=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
            details={'instance_id': instance.id, 'model': instance.__class__.__name__}
        )
        return instance
    
    def perform_destroy(self, instance: Any) -> None:
        """
        Override perform_destroy to log deletion operation.
        
        Args:
            instance: Instance to be deleted
        """
        instance_id = instance.id
        model_name = instance.__class__.__name__
        instance.delete()
        LogService.log_info(
            log_type='admin_action',
            action=f'{self.__class__.__name__}_delete',
            user=self.request.user if hasattr(self, 'request') and self.request.user.is_authenticated else None,
            details={'instance_id': instance_id, 'model': model_name}
        )

