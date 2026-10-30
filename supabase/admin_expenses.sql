-- Stackform admin: expenses table and receipts found so far (Jul–Oct 2026).
-- Run once in the Supabase SQL editor, after admin_schema.sql.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  vendor text not null,
  item text,
  currency text not null default 'SGD',
  amount numeric(12,2) not null,
  sgd_amount numeric(12,2),
  paid_with text,
  reference text,
  receipt text,
  rebill_to text,
  rebilled text default 'No',
  reimbursed text default 'No',
  note text,
  updated_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
drop policy if exists owner_all on public.expenses;
create policy owner_all on public.expenses for all to authenticated using (public.is_owner()) with check (public.is_owner());

insert into public.expenses (date,vendor,item,currency,amount,sgd_amount,paid_with,reference,receipt,rebill_to,note) values
('2026-07-08','Google','stackformstudios.com domain','SGD',20.00,20.00,'Personal card','Payments profile 5239-4394-0849','Email: payment received',null,'Yearly'),
('2026-07-14','Cloudflare','Domain: d2dleagues.com','USD',11.40,null,'Personal card','IN-71479039','Cloudflare dashboard → Billing → Invoices','D2D Sports','Confirm who this domain belongs to'),
('2026-07-31','Twilio','SMS credit top-up','USD',20.00,null,'Personal card','CXeec218a9bbfa58af7446e64764b176aa','Twilio console → Billing → Payments',null,'OTP / SMS'),
('2026-08-01','Google','Workspace (part month)','SGD',5.73,5.73,'Personal card','Payments profile 5239-4394-0849','Admin console → Billing → Documents',null,null),
('2026-08-05','Apple','Apple Developer Program, 1 year','SGD',150.70,150.70,'Personal card','W1776936263 / MC91054248','PDF attached to Apple e-invoice email',null,'Renews Aug 2027'),
('2026-09-01','Google','Workspace','SGD',23.23,23.23,'Personal card','Payments profile 5239-4394-0849','Admin console → Billing → Documents',null,null),
('2026-10-01','Google','Workspace','SGD',24.42,24.42,'Personal card','Payments profile 5239-4394-0849','Admin console → Billing → Documents',null,null),
('2026-10-06','Twilio','SMS auto-recharge','USD',10.01,null,'Personal card','CX291f97e0e417f087bd34b62a7e33456e','Twilio console → Billing → Payments',null,null),
('2026-10-29','Cloudflare','Domain: flairfootballacademy.com','USD',11.40,null,'Personal card','IN-86294161','Cloudflare dashboard → Billing → Invoices','Flair Football Academy','Bill at cost'),
('2026-10-29','Twilio','SMS credit top-up','USD',30.00,null,'Personal card','CXae544fa4a81018f279f4cba973e99e08','Twilio console → Billing → Payments',null,'Account was briefly suspended for low balance before this'),
('2026-10-30','Exabytes','Domain: flairfa.com.sg, 1 year','SGD',49.09,49.09,'Personal card','SG-PAID-60302150','finance repo: expenses/receipts','Flair Football Academy','Incl. 9% GST; bill at cost');
