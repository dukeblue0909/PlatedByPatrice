CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  request_reference TEXT NOT NULL,
  created TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New','Confirmed','Cooking','Ready','Picked up','Cancelled')),
  payment TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment IN ('Unpaid','Paid')),
  details TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS orders_request_reference ON orders(request_reference);
