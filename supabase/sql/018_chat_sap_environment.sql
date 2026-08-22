-- Abapfy — ambiente SAP selecionado no composer e persistido por conversa

alter table public.chats
  add column if not exists sap_environment_id text,
  add column if not exists sap_environment_label text;

comment on column public.chats.sap_environment_id is 'Identificador do produto/release SAP selecionado antes da primeira mensagem.';
comment on column public.chats.sap_environment_label is 'Snapshot legível do ambiente SAP enviado ao agente.';
