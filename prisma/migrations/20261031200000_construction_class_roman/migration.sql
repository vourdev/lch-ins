-- Nama kelas konstruksi memakai angka romawi, sama dengan form slip, panel
-- tarif OJK, dan dokumen cetak. Hanya nama bawaan yang diganti; nama yang
-- sudah diubah lewat master data dibiarkan.
UPDATE "lookup_values" AS lv
SET "name" = v.new_name,
    "updated_at" = CURRENT_TIMESTAMP
FROM (VALUES
  ('K1', 'Kelas 1', 'Class I'),
  ('K2', 'Kelas 2', 'Class II'),
  ('K3', 'Kelas 3', 'Class III')
) AS v(code, old_name, new_name)
WHERE lv."lookup_type" = 'construction_class'
  AND lv."code" = v.code
  AND lv."name" = v.old_name;
