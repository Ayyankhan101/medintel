import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page:       { padding: 36, fontSize: 11, fontFamily: 'Helvetica', color: '#1e293b' },
  header:     { borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 8, marginBottom: 16 },
  brand:      { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  brandSub:   { fontSize: 9, color: '#64748b', marginTop: 2 },
  rowSpaced:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  block:      { flex: 1 },
  label:      { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  value:      { fontSize: 11, marginTop: 2 },
  section:    { marginTop: 14, marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#2563eb', marginBottom: 4, textTransform: 'uppercase' },
  body:       { fontSize: 11, lineHeight: 1.5 },
  severityBox: { padding: 8, borderRadius: 4, marginTop: 8 },
  severityRoutine:  { backgroundColor: '#dcfce7', color: '#166534' },
  severityUrgent:   { backgroundColor: '#fef3c7', color: '#854d0e' },
  severityCritical: { backgroundColor: '#fee2e2', color: '#991b1b' },
  prescriptionBox: { borderWidth: 1, borderColor: '#cbd5e1', padding: 10, marginTop: 6 },
  footer:     { position: 'absolute', bottom: 36, left: 36, right: 36, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, fontSize: 8, color: '#94a3b8', textAlign: 'center' },
  rowSmall:   { flexDirection: 'row', gap: 12, marginTop: 4 },
  disclaimer: { fontSize: 9, color: '#64748b', fontStyle: 'italic', marginTop: 6 },
})

export interface PrescriptionPdfData {
  patient: {
    name: string | null
    medIntelCode: string | null
    email: string
    cnic: string | null
  }
  doctor: {
    name: string | null
    specialization: string
    licenseNumber: string
    email: string
  } | null
  appointment: {
    id: string
    scheduledAt: Date
    completedAt: Date | null
    department: string | null
    transcript: string | null
    aiSummary: string | null
    severityScore: number | null
    severityLevel: string | null
    prescriptionText: string | null
  }
  generatedAt: Date
}

function severityStyle(level: string | null) {
  if (level === 'CRITICAL') return styles.severityCritical
  if (level === 'URGENT')   return styles.severityUrgent
  return styles.severityRoutine
}

export function PrescriptionDoc({ data }: { data: PrescriptionPdfData }) {
  const { patient, doctor, appointment, generatedAt } = data
  return (
    <Document title={`MedIntel — Consultation ${appointment.id}`} author="MedIntel">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>MedIntel</Text>
          <Text style={styles.brandSub}>Voice-first telemedicine · Pakistan</Text>
        </View>

        <View style={styles.rowSpaced}>
          <View style={styles.block}>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>{patient.name ?? patient.email}</Text>
            <Text style={styles.value}>MedIntel ID: {patient.medIntelCode ?? '—'}</Text>
            {patient.cnic && <Text style={styles.value}>CNIC: {patient.cnic}</Text>}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Consulting Doctor</Text>
            <Text style={styles.value}>{doctor?.name ?? doctor?.email ?? 'Not assigned'}</Text>
            {doctor && <Text style={styles.value}>{doctor.specialization}</Text>}
            {doctor && <Text style={styles.value}>PMDC: {doctor.licenseNumber}</Text>}
          </View>
        </View>

        <View style={styles.rowSpaced}>
          <View style={styles.block}>
            <Text style={styles.label}>Consultation Date</Text>
            <Text style={styles.value}>{appointment.scheduledAt.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{appointment.department ?? 'General Medicine'}</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Appointment ID</Text>
            <Text style={styles.value}>{appointment.id.slice(0, 12)}</Text>
          </View>
        </View>

        {appointment.severityLevel && (
          <View style={[styles.severityBox, severityStyle(appointment.severityLevel)]}>
            <Text>
              <Text style={{ fontWeight: 'bold' }}>Triage assessment: </Text>
              {appointment.severityLevel}
              {appointment.severityScore != null && ` (${appointment.severityScore}/10)`}
              {appointment.severityLevel === 'CRITICAL' && '  ·  Hospital admission recommended'}
              {appointment.severityLevel === 'URGENT'   && '  ·  See specialist within 24 hours'}
              {appointment.severityLevel === 'ROUTINE'  && '  ·  Non-urgent, routine follow-up'}
            </Text>
          </View>
        )}

        {appointment.transcript && (
          <View style={styles.section}>
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            <Text style={styles.sectionTitle}>Patient's words</Text>
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            <Text style={styles.body}>"{appointment.transcript}"</Text>
          </View>
        )}

        {appointment.aiSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinical summary</Text>
            <Text style={styles.body}>{appointment.aiSummary}</Text>
            <Text style={styles.disclaimer}>AI-assisted summary — verified by the consulting doctor.</Text>
          </View>
        )}

        {appointment.prescriptionText && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription & instructions</Text>
            <View style={styles.prescriptionBox}>
              <Text style={styles.body}>{appointment.prescriptionText}</Text>
            </View>
          </View>
        )}

        {!appointment.prescriptionText && appointment.completedAt == null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription</Text>
            <Text style={[styles.body, { color: '#94a3b8' }]}>Consultation not yet completed — prescription will appear here once issued.</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For hospital staff</Text>
          <Text style={styles.body}>
            This document is a MedIntel teleconsultation summary. Present at the front desk for triage.
            Patient identity is verified against NADRA via CNIC. Consulting doctor is PMDC-licensed and KYD-verified.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <Text>Generated {generatedAt.toLocaleString('en-PK')} · MedIntel · Document is signed by the issuing doctor's account. Not a substitute for a physical examination.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderPrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
  return await renderToBuffer(<PrescriptionDoc data={data} />)
}
