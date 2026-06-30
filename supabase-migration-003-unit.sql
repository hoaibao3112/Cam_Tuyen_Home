-- Migration 003: Thêm cột unit (đơn vị tính) vào bảng menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS unit text;
