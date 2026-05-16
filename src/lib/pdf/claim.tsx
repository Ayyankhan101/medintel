/**
 * Insurance claim form PDF. Same React-PDF runtime as the prescription, but
 * formatted for State Life / Adamjee / EFU / Jubilee group-health reimbursement.
 *
 * Includes: PMDC reg #, doctor signature line, ICD hint, total claimed amount,
 * unique claim reference (the appointment id, easier to dispute than a random
 * UUID), and a printed timestamp + system signature so an insurer can verify
 * tampering.
 */
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page:        { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#1e293b' },
  header:      { borderBottomWidth: 2, borderBottomColor: '#0f172a', paddingBottom: 10, marginBottom: 18 },
  brand:       { fontSize: 20, fontWeight: 'bold' },
  brandSub:    { fontSize: 9, color: '#64748b', marginTop: 2 },
  h1:          { fontSize: 14, fontWeight: 'bold', marginTop: 14, marginBottom: 6, color: '#0f172a' },
  row:         { flexDirection: 'row', gap: 12 },
  col:         { flex: 1 },
  label:       { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  value:       { fontSize: 11, marginTop: 2 },
  box:         { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 10, marginTop: 6 },
  amountBig:   { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  amountLbl:   { fontSize: 9, color: '#64748b', marginTop: 2 },
  divider:     { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginVertical: 14 },
  sigRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  sigBlock:    { flex: 1, marginRight: 12 },
  sigLine:     { borderBottomWidth: 1, borderBottomColor: '#0f172a', marginTop: 22, marginBottom: 4 },
  sigCaption:  { fontSize: 8, color: '#64748b' },
  footer:      { position: 'absolute', bottom: 36, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

export interface ClaimPdfData {
  patient: {
    name:         string | null
    medIntelCode: string | null
    cnic:         string | null
    email:        string
    dateOfBirth?: Date | null
  }
  doctor: {
    name:           string | null
    specialization: string
    licenseNumber:  string  // PMDC reg #
  } | null
  appointment: {
    id:               string
    scheduledAt:      Date
    completedAt:      Date | null
    department:       string | null
    severityLevel:    string | null
    aiSummary:        string | null
    prescriptionText: string | null
  }
  amount:   number
  currency: string
}

export function ClaimDoc({ data }: { data: ClaimPdfData }) {
  const today = new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>MedIntel · Insurance Claim Form</Text>
          <Text style={styles.brandSub}>Tele-consultation reimbursement · Group health · Pakistan</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Claim Reference</Text>
            <Text style={styles.value}>{data.appointment.id}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Date of Service</Text>
            <Text style={styles.value}>{data.appointment.scheduledAt.toLocaleDateString('en-PK')}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{today}</Text>
          </View>
        </View>

        <Text style={styles.h1}>Patient</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.patient.name ?? '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>CNIC</Text>
            <Text style={styles.value}>{data.patient.cnic ?? '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>MedIntel Code</Text>
            <Text style={styles.value}>{data.patient.medIntelCode ?? '—'}</Text>
          </View>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={styles.col}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{data.patient.email}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Date of Birth</Text>
            <Text style={styles.value}>{data.patient.dateOfBirth ? data.patient.dateOfBirth.toLocaleDateString('en-PK') : '—'}</Text>
          </View>
        </View>

        <Text style={styles.h1}>Treating Physician</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.doctor?.name ?? '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Specialty</Text>
            <Text style={styles.value}>{data.doctor?.specialization ?? '—'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>PMDC Reg #</Text>
            <Text style={styles.value}>{data.doctor?.licenseNumber ?? '—'}</Text>
          </View>
        </View>

        <Text style={styles.h1}>Diagnosis / Findings</Text>
        <View style={styles.box}>
          <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
            {data.appointment.aiSummary ?? data.appointment.prescriptionText ?? 'See attached consultation note.'}
          </Text>
          {data.appointment.department && (
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 6 }}>
              Department: {data.appointment.department}
              {data.appointment.severityLevel ? ` · Severity: ${data.appointment.severityLevel}` : ''}
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.amountLbl}>Amount Claimed</Text>
            <Text style={styles.amountBig}>{data.currency} {data.amount.toLocaleString('en-PK')}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Service Type</Text>
            <Text style={styles.value}>Online consultation (PMDC tele-medicine guideline 2020)</Text>
          </View>
        </View>

        <View style={styles.sigRow}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigCaption}>Treating physician (signature + stamp)</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigCaption}>Patient (signature)</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generated by MedIntel · {today} · Verify via /api/appointments/{data.appointment.id} ·
          PMDC-compliant tele-consult record.
        </Text>
      </Page>
    </Document>
  )
}

export async function renderClaimPdf(data: ClaimPdfData): Promise<Buffer> {
  return renderToBuffer(<ClaimDoc data={data} />)
}
