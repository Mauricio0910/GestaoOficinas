# Atualização — Redesign visual e imagens de veículos

Esta atualização aplica o novo layout premium do GestãoOficinas Pro e troca os desenhos técnicos antigos por imagens/ilustrações de veículos por categoria.

## Incluído

- Novo dashboard com KPIs, cards de veículos, gráficos visuais e atividades recentes.
- Novo visual da inspeção técnica da OS.
- Galeria de tipos de veículo:
  - Moto
  - Automóvel
  - SUV
  - Caminhonete
  - Caminhão Toco
  - Caminhão Baú
  - Ônibus
- Assets em `assets/vehicles/`.
- Preview de veículo melhorado no cadastro/identificação rápida.
- Service Worker atualizado para limpar cache da versão anterior.

## Como aplicar no GitHub/Codespaces

1. Faça upload do ZIP no Codespaces.
2. Execute:

```bash
unzip -o gestao-oficinas-pro-redesign-veiculos-github.zip
cp -r oficina-os-pwa/* .
cp -r oficina-os-pwa/.[!.]* . 2>/dev/null || true
rm -rf oficina-os-pwa
rm gestao-oficinas-pro-redesign-veiculos-github.zip
git add .
git commit -m "Aplica redesign visual e imagens de veiculos"
git push
```

## Importante sobre Firebase

Este pacote não inclui `firebase-config.js`, para não sobrescrever sua configuração atual.
Se o seu repositório já possui `firebase-config.js`, ele será preservado.

## Cache/PWA

Após publicar, abra com uma versão nova na URL:

```
?v=11
```

ou faça Ctrl+F5. No celular, limpe os dados do site ou reinstale o PWA se necessário.
