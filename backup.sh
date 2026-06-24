#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo "Error: .env file not found!"
  exit 1
fi

set -a
source .env
set +a

BACKUP_DIR="$SCRIPT_DIR/Backups"

mkdir -p "$BACKUP_DIR"

parse_time() {
  local time_str="$1"
  IFS=':' read -r hour minute <<< "$time_str"
  echo "$((hour * 3600 + minute * 60))"
}

should_backup() {
  local current_hour=$(date +%H)
  local current_minute=$(date +%M)
  local current_seconds=$((current_hour * 3600 + current_minute * 60))

  IFS=',' read -ra TIMES <<< "$BACKUP_TIMES"
  for time in "${TIMES[@]}"; do
    local target_seconds=$(parse_time "$time")
    if [ "$current_seconds" -eq "$target_seconds" ]; then
      return 0
    fi
  done
  return 1
}

perform_backup() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="$BACKUP_DIR/${DB_NAME}_${timestamp}.sql.gz"

  echo "Iniciando backup: $backup_file"

  docker exec db_mozartv1 mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$backup_file"

  if [ $? -eq 0 ]; then
    echo "Backup completado exitosamente: $backup_file"
  else
    echo "Error al crear el backup"
  fi

  echo "Eliminando backups antiguos (más de $BACKUP_RETENTION_DAYS días)..."
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
  echo "Limpieza completada"
}

last_backup_date=""
already_backed_up_times=()

while true; do
  current_date=$(date +%Y-%m-%d)
  if [ "$current_date" != "$last_backup_date" ]; then
    already_backed_up_times=()
  fi

  if should_backup; then
    current_time=$(date +%H:%M)
    if [[ ! " ${already_backed_up_times[@]} " =~ " ${current_time} " ]]; then
      perform_backup
      already_backed_up_times+=("$current_time")
      last_backup_date="$current_date"
    fi
  fi

  sleep 30
done
