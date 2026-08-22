-- Abapfy — catálogo de temas SAP Fiori/Horizon

alter table public.user_settings drop constraint if exists user_settings_theme_check;
alter table public.user_settings alter column theme set default 'sap-horizon-light';

update public.user_settings
set theme = 'sap-horizon-light'
where theme in ('linear-dark', 'emerald-dark', 'amber-dark', 'crimson-dark');

alter table public.user_settings add constraint user_settings_theme_check check (
  theme in (
    'sap-horizon-light', 'sap-horizon-dark', 'sap-quartz-light', 'sap-quartz-dark',
    'sap-horizon-hcw', 'sap-horizon-hcb'
  )
);
