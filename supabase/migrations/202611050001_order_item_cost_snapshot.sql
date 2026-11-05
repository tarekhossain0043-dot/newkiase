-- Store the product purchase cost at the time an order is placed.
-- This keeps historical profit reports accurate when a product's base price changes.
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS order_items_product_id_idx
ON public.order_items(product_id);
