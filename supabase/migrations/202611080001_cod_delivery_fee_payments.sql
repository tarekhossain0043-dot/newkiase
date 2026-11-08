alter table public.payments
  add column if not exists amount numeric(12,2) not null default 0 check (amount >= 0),
  add column if not exists purpose text not null default 'order_total',
  add column if not exists recipient_number text;

comment on column public.payments.amount is 'Amount submitted for this payment record; for COD orders this is only the prepaid delivery fee.';
comment on column public.payments.purpose is 'Payment purpose: delivery_fee, order_total, or cod_collection.';
comment on column public.payments.recipient_number is 'Store bKash/Nagad recipient number used for this payment.';
