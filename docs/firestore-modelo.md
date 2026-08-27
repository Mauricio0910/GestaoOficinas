# Modelo Firestore - OficinaPro OS

## Coleções

A aplicação usa uma estrutura multiempresa simples baseada no `FIREBASE_TENANT_ID`.

```text
oficinas/{tenantId}
```

Cada oficina possui subcoleções próprias.

## Configuração

```text
oficinas/{tenantId}/meta/config
```

Campos principais:

- nomeFantasia
- cnpj
- telefone
- email
- endereco
- garantiaPadraoDias
- comissaoPadrao

## Usuários

```text
oficinas/{tenantId}/users/{id}
```

Campos:

- nome
- email
- senha
- perfil
- ativo
- criadoEm

Observação: no MVP a senha ainda é usada apenas para validação interna. Para produção, usar Firebase Authentication.

## Clientes

```text
oficinas/{tenantId}/clientes/{id}
```

## Veículos

```text
oficinas/{tenantId}/veiculos/{id}
```

## Serviços

```text
oficinas/{tenantId}/servicos/{id}
```

## Peças

```text
oficinas/{tenantId}/pecas/{id}
```

## Ordens

```text
oficinas/{tenantId}/ordens/{id}
```

A OS guarda itens, checklist, assinatura e garantia como objetos internos.  
Para produção em alto volume, pode ser melhor separar:

```text
ordens/{id}/servicos/{idItem}
ordens/{id}/pecas/{idItem}
ordens/{id}/checklist/{idChecklist}
ordens/{id}/anexos/{idAnexo}
```

## Logs

```text
oficinas/{tenantId}/logs/{id}
```

## Preparação para integração veicular futura

Pode ser adicionada a coleção:

```text
oficinas/{tenantId}/consultas_veiculares/{id}
```

Campos sugeridos:

- tipoConsulta: PLACA, CHASSI, RENAVAM
- parametroConsulta
- finalidade
- usuarioId
- status
- respostaResumida
- erro
- criadoEm
