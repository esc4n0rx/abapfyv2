export interface SapEnvironmentDefinition {
  id: string
  label: string
  family: 'Não definido' | 'SAP ERP ECC' | 'SAP S/4HANA' | 'SAP Cloud'
  context: string
}

export const SAP_ENVIRONMENTS: SapEnvironmentDefinition[] = [
  {
    id: 'unspecified',
    label: 'Ambiente SAP não definido',
    family: 'Não definido',
    context:
      'A versão do sistema SAP não foi informada. Peça confirmação quando a resposta depender da release.'
  },
  {
    id: 'ecc-ehp6',
    label: 'SAP ERP 6.0 EHP6',
    family: 'SAP ERP ECC',
    context:
      'SAP ERP 6.0 Enhancement Package 6, baseado em SAP NetWeaver 7.03. Não presuma recursos exclusivos de releases posteriores.'
  },
  {
    id: 'ecc-ehp7',
    label: 'SAP ERP 6.0 EHP7',
    family: 'SAP ERP ECC',
    context:
      'SAP ERP 6.0 Enhancement Package 7, normalmente baseado em SAP NetWeaver 7.40. Considere sintaxe e APIs compatíveis com esta geração.'
  },
  {
    id: 'ecc-ehp8',
    label: 'SAP ERP 6.0 EHP8',
    family: 'SAP ERP ECC',
    context:
      'SAP ERP 6.0 Enhancement Package 8, baseado em SAP NetWeaver 7.50. Diferencie capacidades do ECC das simplificações do S/4HANA.'
  },
  {
    id: 's4-2020',
    label: 'SAP S/4HANA 2020',
    family: 'SAP S/4HANA',
    context:
      'SAP S/4HANA 2020 on-premise ou Private Cloud. Priorize APIs e modelos de dados compatíveis com essa release.'
  },
  {
    id: 's4-2021',
    label: 'SAP S/4HANA 2021',
    family: 'SAP S/4HANA',
    context: 'SAP S/4HANA 2021 on-premise ou Private Cloud.'
  },
  {
    id: 's4-2022',
    label: 'SAP S/4HANA 2022',
    family: 'SAP S/4HANA',
    context: 'SAP S/4HANA 2022 on-premise ou Private Cloud.'
  },
  {
    id: 's4-2023',
    label: 'SAP S/4HANA 2023',
    family: 'SAP S/4HANA',
    context:
      'SAP S/4HANA 2023 on-premise ou Private Cloud. Considere ABAP Platform e extensibilidade disponíveis nessa release.'
  },
  {
    id: 's4-2025-fps01',
    label: 'SAP S/4HANA 2025 FPS01',
    family: 'SAP S/4HANA',
    context:
      'SAP S/4HANA e SAP S/4HANA Cloud Private Edition 2025 FPS01. Priorize Clean Core, APIs liberadas e recursos atuais, sem projetá-los retroativamente para ECC.'
  },
  {
    id: 's4-public-current',
    label: 'SAP S/4HANA Cloud Public Edition',
    family: 'SAP Cloud',
    context:
      'SAP S/4HANA Cloud Public Edition. Use somente extensibilidade e APIs liberadas para cloud; não recomende modificações clássicas no core.'
  },
  {
    id: 'btp-abap',
    label: 'SAP BTP ABAP Environment',
    family: 'SAP Cloud',
    context:
      'SAP BTP ABAP Environment com ABAP Cloud. Use objetos e APIs liberados e respeite as restrições de linguagem ABAP Cloud.'
  }
]

export const DEFAULT_SAP_ENVIRONMENT_ID = 'unspecified'

export function getSapEnvironment(id: string | null | undefined): SapEnvironmentDefinition {
  return SAP_ENVIRONMENTS.find((environment) => environment.id === id) ?? SAP_ENVIRONMENTS[0]
}

export function buildSapEnvironmentPrompt(environment: SapEnvironmentDefinition): string {
  return `## Ambiente SAP alvo\n\nProduto/release selecionado: **${environment.label}**.\n${environment.context}\nAdapte sintaxe, APIs, transações, extensibilidade e recomendações a esse ambiente. Quando algo depender de Support Package, add-on ou configuração não informada, identifique como **A CONFIRMAR**.`
}
