# Incremento: Dashboard, identificação de veículos e checklist de defeitos

## Dashboard
Foram adicionados:
- OS em execução;
- OS finalizadas/faturadas;
- quantidade de veículos cadastrados;
- defeitos pendentes;
- gráfico simples de OS por status;
- serviços mais lançados;
- defeitos/avarias recentes.

## Veículos
A aba **Veículos** agora possui um painel de **Identificação rápida do veículo**:
- placa;
- marca;
- modelo;
- ano modelo;
- cor;
- KM atual;
- prévia visual de marca/modelo/ano.

Ao clicar em **Usar em novo cadastro**, o formulário de veículo abre preenchido.

## Base local de modelos
O app contém uma base inicial extensível em `app.js`, função `vehicleCatalog()`, e salva esta base em `catalogoVeiculos` quando o Firebase está ativo.

Coleções Firestore usadas:
- `oficinas/{tenantId}/catalogoVeiculos/{id}`
- `oficinas/{tenantId}/veiculos/{id}`

## Checklist do mecânico
O checklist da OS permite marcar defeitos no desenho do veículo informando:
- área;
- tipo de defeito;
- gravidade;
- status;
- observação;
- foto/URL opcional.

As marcações ficam dentro de:
`ordens.checklist.entrada.marcacoes`.

## Próximo passo recomendado
Para uma base oficial/completa de marcas/modelos/anos/preços, integrar depois com uma API FIPE pública ou licenciada. Isso é separado da integração SENATRAN.
