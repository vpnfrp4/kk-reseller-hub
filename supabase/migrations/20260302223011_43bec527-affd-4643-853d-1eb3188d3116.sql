-- Prevent duplicate custom fields per product + field_name + linked_mode
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_custom_fields_unique 
ON public.product_custom_fields (product_id, field_name, linked_mode);