insert into prediction_rules (zone, month, hour_bucket, species, weight)
values
  ('Tarifa Centro', 10, 'dawn', 'Cernicalo vulgar', 4),
  ('Tarifa Centro', 10, 'morning', 'Gorrion comun', 3),
  ('Tarifa Centro', 10, 'evening', 'Estornino negro', 2),
  ('Bolonia', 10, 'dawn', 'Abejaruco europeo', 5),
  ('Bolonia', 10, 'afternoon', 'Milano negro', 3)
on conflict (zone, month, hour_bucket, species) do update set weight = excluded.weight;
