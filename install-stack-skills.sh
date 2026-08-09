#!/usr/bin/env bash
#
# install-stack-skills.sh
# Instala los skills de Claude Code recomendados para el stack:
# Angular (Zoneless/Signals) + Tailwind + PrimeNG + NestJS + Prisma + PostgreSQL
#
# Uso:
#   ./install-stack-skills.sh            -> instala a nivel PROYECTO (default)
#   ./install-stack-skills.sh --global   -> instala a nivel GLOBAL (~/.claude/skills)
#   ./install-stack-skills.sh --list     -> solo muestra qué se instalaría, sin instalar
#
# Requisitos: Node.js / npm (usa npx skills, de https://www.skills.sh)

set -euo pipefail

SCOPE=""
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --global|-g)
      SCOPE="--global"
      ;;
    --list)
      DRY_RUN=true
      ;;
    *)
      echo "Argumento desconocido: $arg"
      echo "Uso: $0 [--global|-g] [--list]"
      exit 1
      ;;
  esac
done

# Cada entrada: "repo|skill-especifico" (skill vacío = instala el repo completo)
SKILLS=(
  "analogjs/angular-skills|"                                    # Angular: component, signals, forms, routing, http, di
  "alfredoperez/angular-best-practices|"                        # Angular + PrimeNG best-practices (incluye angular-best-practices-primeng)
  "wshobson/agents|tailwind-design-system"                      # Tailwind: sistema de diseño
  "kadajett/agent-nestjs-skills|nestjs-best-practices"           # NestJS: mejores prácticas
  "shipshitdev/library|nestjs-testing-expert"                    # NestJS: testing unitario y e2e (Jest/Supertest)
  "wshobson/agents|typescript-advanced-types"                   # TypeScript avanzado
  "prisma/skills|prisma-database-setup"                          # Prisma: setup de DB
  "prisma/skills|prisma-client-api"                              # Prisma: Client API (CRUD, transacciones)
  "prisma/skills|prisma-cli"                                     # Prisma: CLI completa
  "prisma/skills|prisma-postgres"                                # Prisma: específico de PostgreSQL
  "pbakaus/impeccable|"                                          # Diseño: evita clichés genéricos de UI generada por IA
  "emilkowalski/skills|"                                         # Diseño: micro-interacciones y animación (autor de Vaul/Sonner)
  "Leonxlnx/taste-skill|"                                        # Diseño: dirección estética (paletas, estilos, tipografía)
  "agamm/claude-code-owasp|"                                     # Seguridad: OWASP Top 10:2025 + ASVS 5.0
  "mindrally/skills|jwt-security"                                # Seguridad: buenas prácticas de JWT
  "antfu/skills|vitest"                                          # Angular: testing unitario con Vitest
  "wshobson/agents|e2e-testing-patterns"                         # Angular: patrones de testing e2e
  "github/awesome-copilot|multi-stage-dockerfile"                # Docker: Dockerfiles multi-stage optimizados
  "redis/agent-skills|"                                          # Redis: oficial (development, core, security, etc.)
  "wshobson/agents|openapi-spec-generation"                      # NestJS: generación de specs OpenAPI/Swagger
)

echo "Alcance: ${SCOPE:-proyecto (local)}"
echo "Skills a instalar: ${#SKILLS[@]}"
echo "-----------------------------------"

for entry in "${SKILLS[@]}"; do
  repo="${entry%%|*}"
  skill="${entry#*|}"

  if [ -n "$skill" ]; then
    cmd=(npx skills add "$repo" --skill "$skill")
  else
    cmd=(npx skills add "$repo")
  fi
  [ -n "$SCOPE" ] && cmd+=("$SCOPE")
  cmd+=(-y)

  if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] ${cmd[*]}"
  else
    echo ">> Instalando: $repo${skill:+ (skill: $skill)}"
    "${cmd[@]}" || echo "   ⚠️  Falló: $repo${skill:+ ($skill)} (revisar manualmente)"
    echo ""
  fi
done

if [ "$DRY_RUN" = false ]; then
  echo "-----------------------------------"
  echo "Listo. Verificá con: npx skills list"
  if [ -z "$SCOPE" ]; then
    echo "Tip: si querés versionarlos con el equipo, corré:"
    echo "  git add .claude/skills/ && git commit -m 'chore: agrego skills del stack'"
  fi
fi
