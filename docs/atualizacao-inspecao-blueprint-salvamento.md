# Atualização: Inspeção técnica com blueprint e salvamento

## Itens corrigidos

- A inspeção técnica agora grava um espelho direto em `os.inspecaoTecnica`.
- O checklist continua salvo em `os.checklist.entrada`.
- Ao salvar, o documento da OS no Firestore recebe:
  - `inspecaoTecnica.tipoVeiculo`
  - `inspecaoTecnica.partes`
  - `inspecaoTecnica.totalPartes`
  - `inspecaoTecnica.pendencias`
  - `inspecaoTecnica.servicosAExecutar`
  - `inspecaoTecnica.atualizadoEm`

## Onde conferir no Firebase

Caminho atual usado pelo app:

```text
oficinas/{tenantId}/ordens/{idDaOS}
```

Dentro do documento da OS, confira os campos:

```text
checklist.entrada.marcacoes
inspecaoTecnica.partes
```

## Diagramas técnicos

Os diagramas agora são SVG inline, com fundo branco e traço azul técnico, separados por tipo:

- Moto
- Automóvel
- SUV
- Caminhonete
- Caminhão toco
- Caminhão baú
- Ônibus

## Cache

Esta versão altera o cache do service worker para:

```text
oficinapro-os-v4-inspecao-blueprint-save
```

Após publicar, abra com `?v=7` ou use Ctrl+F5.
