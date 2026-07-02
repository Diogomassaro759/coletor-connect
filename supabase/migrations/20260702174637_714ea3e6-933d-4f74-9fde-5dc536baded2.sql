
ALTER TABLE public.catadores
  ALTER COLUMN nome_completo DROP NOT NULL,
  ALTER COLUMN genero DROP NOT NULL,
  ALTER COLUMN autodeclaracao_racial DROP NOT NULL,
  ALTER COLUMN escolaridade DROP NOT NULL,
  ALTER COLUMN endereco_completo DROP NOT NULL,
  ALTER COLUMN cpf DROP NOT NULL,
  ALTER COLUMN rg_cin DROP NOT NULL,
  ALTER COLUMN renda_media_mensal DROP NOT NULL,
  ALTER COLUMN contribui_inss DROP NOT NULL,
  ALTER COLUMN inscrito_cadunico DROP NOT NULL,
  ALTER COLUMN possui_bolsa_familia DROP NOT NULL,
  ALTER COLUMN cadastro_gov_br DROP NOT NULL,
  ALTER COLUMN materiais_coletados DROP NOT NULL,
  ALTER COLUMN possui_carroca DROP NOT NULL;
