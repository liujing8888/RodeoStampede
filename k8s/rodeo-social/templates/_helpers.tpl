{{- define "rodeo-social.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "rodeo-social.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- include "rodeo-social.name" . }}
{{- end }}
{{- end }}

{{- define "rodeo-social.labels" -}}
app.kubernetes.io/name: {{ include "rodeo-social.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{- define "rodeo-social.selectorLabels" -}}
app.kubernetes.io/name: {{ include "rodeo-social.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}