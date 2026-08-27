# Inspeção técnica por tipo de veículo

A tela de Ordem de Serviço agora permite selecionar o tipo de veículo e abrir uma inspeção técnica com diagrama visual.

## Tipos suportados

- Moto
- Automóvel
- SUV
- Caminhonete
- Caminhão toco
- Caminhão baú
- Ônibus

## Fluxo

1. Abra uma OS.
2. Entre em **Inspeção técnica**.
3. Confirme o tipo do veículo.
4. Marque as partes analisadas.
5. Informe defeito, gravidade, status e relato.
6. Selecione as peças sugeridas.
7. Escolha um serviço sugerido ou cadastre um novo serviço.
8. Clique em **Salvar análise técnica**.
9. Clique em **Gerar serviços/peças na OS** para lançar os itens na OS.

## Coleções Firebase novas

A versão passa a sincronizar também:

```text
oficinas/{tenantId}/catalogoPartes
oficinas/{tenantId}/catalogoPecas
oficinas/{tenantId}/servicosCatalogo
```

As regras de teste atuais com wildcard `match /oficinas/{oficinaId}/{document=**}` já cobrem essas coleções.
