'use client';

import { DatePickerField } from '@/components/DatePickerField';
import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type ClientFamilyMember = {
  id?: string;
  fullName: string;
  dateOfBirth?: string;
  relationship?: string;
  notes?: string;
};

type ClientDocument = {
  id?: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  fileDataBase64?: string;
  notes?: string;
  uploadedAt?: string;
};

type AdminClient = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
  passwordSet: boolean;
  bookingCount: number;
  dateOfBirth?: string;
  idPassportInfo?: string;
  address?: string;
  medicalInsuranceName?: string;
  notificationAppPush: boolean;
  notificationEmail: boolean;
  notificationSms: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergiesMedicalAlerts?: string;
  preferredLanguage?: string;
  preferredContactTime?: string;
  familyMembers: ClientFamilyMember[];
  documents: ClientDocument[];
};

type EditingClient = Omit<AdminClient, 'passwordSet' | 'bookingCount'>;

function blankClient(): EditingClient {
  return {
    id: 'new',
    fullName: '',
    phone: '',
    email: '',
    notes: '',
    dateOfBirth: '',
    idPassportInfo: '',
    address: '',
    medicalInsuranceName: '',
    notificationAppPush: true,
    notificationEmail: true,
    notificationSms: true,
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergiesMedicalAlerts: '',
    preferredLanguage: '',
    preferredContactTime: '',
    familyMembers: [],
    documents: []
  };
}

function editFromClient(client: AdminClient): EditingClient {
  return {
    id: client.id,
    fullName: client.fullName,
    phone: client.phone,
    email: client.email,
    notes: client.notes ?? '',
    dateOfBirth: client.dateOfBirth ?? '',
    idPassportInfo: client.idPassportInfo ?? '',
    address: client.address ?? '',
    medicalInsuranceName: client.medicalInsuranceName ?? '',
    notificationAppPush: client.notificationAppPush !== false,
    notificationEmail: client.notificationEmail !== false,
    notificationSms: client.notificationSms !== false,
    emergencyContactName: client.emergencyContactName ?? '',
    emergencyContactPhone: client.emergencyContactPhone ?? '',
    allergiesMedicalAlerts: client.allergiesMedicalAlerts ?? '',
    preferredLanguage: client.preferredLanguage ?? '',
    preferredContactTime: client.preferredContactTime ?? '',
    familyMembers: Array.isArray(client.familyMembers) ? client.familyMembers : [],
    documents: Array.isArray(client.documents) ? client.documents : []
  };
}

function formatBytes(size?: number) {
  const bytes = Number(size ?? 0);
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadDocument(document: ClientDocument) {
  if (!document.fileDataBase64) return;
  const link = window.document.createElement('a');
  link.href = `data:${document.mimeType || 'application/octet-stream'};base64,${document.fileDataBase64}`;
  link.download = document.fileName || 'client-document';
  link.click();
}

export default function AdminClientEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = decodeURIComponent(String(params.id ?? 'new'));
  const isNew = clientId === 'new';
  const authHeaders = makeAdminAuthHeaders();

  const [client, setClient] = useState<AdminClient | null>(null);
  const [editingClient, setEditingClient] = useState<EditingClient>(blankClient());
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) {
      setEditingClient(blankClient());
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadClient() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(clientId)}`, {
          cache: 'no-store',
          headers: makeAdminAuthHeaders()
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load client.');
        if (cancelled) return;
        const loadedClient = payload.customer as AdminClient;
        setClient(loadedClient);
        setEditingClient(editFromClient(loadedClient));
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load client.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadClient();
    return () => { cancelled = true; };
  }, [clientId, isNew]);

  function updateEditing(patch: Partial<EditingClient>) {
    setEditingClient((current) => ({ ...current, ...patch }));
  }

  function addFamilyMember() {
    updateEditing({ familyMembers: [...editingClient.familyMembers, { id: `fam-local-${Date.now()}`, fullName: '', dateOfBirth: '' }] });
  }

  function updateFamilyMember(index: number, patch: Partial<ClientFamilyMember>) {
    const next = editingClient.familyMembers.map((member, memberIndex) => memberIndex === index ? { ...member, ...patch } : member);
    updateEditing({ familyMembers: next });
  }

  function removeFamilyMember(index: number) {
    updateEditing({ familyMembers: editingClient.familyMembers.filter((_, memberIndex) => memberIndex !== index) });
  }

  async function addDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('For now, upload documents up to 2 MB each.');
      return;
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? '').split(',')[1] ?? '');
      reader.onerror = () => reject(new Error('Could not read document.'));
      reader.readAsDataURL(file);
    });
    updateEditing({
      documents: [
        ...editingClient.documents,
        { id: `doc-local-${Date.now()}`, fileName: file.name, mimeType: file.type, fileSize: file.size, fileDataBase64: base64, notes: '' }
      ]
    });
    showAdminToast('Document added. Save the client to keep it.', 'info');
  }

  function updateDocument(index: number, patch: Partial<ClientDocument>) {
    const next = editingClient.documents.map((document, documentIndex) => documentIndex === index ? { ...document, ...patch } : document);
    updateEditing({ documents: next });
  }

  function removeDocument(index: number) {
    updateEditing({ documents: editingClient.documents.filter((_, documentIndex) => documentIndex !== index) });
  }

  async function saveClient() {
    setSaving(true);
    setError('');
    try {
      const url = isNew ? '/api/admin-data/customers' : `/api/admin-data/customers/${encodeURIComponent(clientId)}`;
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(editingClient)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not save client.');
      showAdminToast(isNew ? 'Client added.' : 'Client saved.');
      router.push('/admin/data');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save client.');
    } finally {
      setSaving(false);
    }
  }

  async function setPassword() {
    if (isNew || !client || !newPassword) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(client.id)}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ password: newPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not set password.');
      const updatedClient = payload.customer as AdminClient;
      setNewPassword('');
      setClient(updatedClient);
      setEditingClient(editFromClient(updatedClient));
      showAdminToast(`Password saved for ${updatedClient.fullName}.`);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Could not set password.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient() {
    if (isNew || !client) return;
    const confirmed = window.confirm(`Delete ${client.fullName}, their client login, family listing, documents, sessions, OTPs and linked bookings? This cannot be undone.`);
    if (!confirmed) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(client.id)}?confirm=DELETE`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not delete client.');
      showAdminToast('Client deleted.');
      router.push('/admin/data');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete client.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />

      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Clients · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">{isNew ? 'Add client.' : 'Edit client.'}</h1>
          <p className="hero-copy tight-copy">Edit the client details, save, then return to the Clients page.</p>
        </div>
        <div className="command-actions admin-compact-actions">
          <Link className="pill admin-compact-button" href="/admin/data">Back to clients</Link>
          <button type="button" onClick={saveClient} disabled={loading || saving} className={`button primary admin-compact-button admin-busy-button ${saving ? 'is-loading' : ''}`}>{saving && <span className="admin-spinner" aria-hidden="true" />}{isNew ? 'Save new client' : 'Save client'}</button>
        </div>
      </section>

      {error && <section className="notice warning" role="alert">{error}</section>}
      {loading ? (
        <section className="card clean-panel"><p className="mini-copy">Loading client...</p></section>
      ) : (
        <section className="card clean-panel clients-editor-page-panel">
          <div className="admin-data-editor clients-editor">
            <div className="grid two controls-grid">
              <div className="form-row">
                <label htmlFor="editFullName">Full name</label>
                <input id="editFullName" value={editingClient.fullName} onChange={(event) => updateEditing({ fullName: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editDob">Date of birth</label>
                <DatePickerField id="editDob" value={editingClient.dateOfBirth ?? ''} placeholder="Select date of birth" ariaLabel="Choose client date of birth" onChange={(nextDate) => updateEditing({ dateOfBirth: nextDate })} />
              </div>
              <div className="form-row">
                <label htmlFor="editPhone">Phone</label>
                <input id="editPhone" value={editingClient.phone} onChange={(event) => updateEditing({ phone: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editEmail">Email</label>
                <input id="editEmail" type="email" value={editingClient.email} onChange={(event) => updateEditing({ email: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editIdPassport">ID or passport info</label>
                <input id="editIdPassport" value={editingClient.idPassportInfo ?? ''} onChange={(event) => updateEditing({ idPassportInfo: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editInsurance">Medical insurance name</label>
                <input id="editInsurance" value={editingClient.medicalInsuranceName ?? ''} onChange={(event) => updateEditing({ medicalInsuranceName: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editEmergencyName">Emergency contact name</label>
                <input id="editEmergencyName" value={editingClient.emergencyContactName ?? ''} onChange={(event) => updateEditing({ emergencyContactName: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editEmergencyPhone">Emergency contact phone</label>
                <input id="editEmergencyPhone" value={editingClient.emergencyContactPhone ?? ''} onChange={(event) => updateEditing({ emergencyContactPhone: event.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="editAddress">Address</label>
              <textarea id="editAddress" value={editingClient.address ?? ''} onChange={(event) => updateEditing({ address: event.target.value })} rows={2} />
            </div>

            <div className="notification-card">
              <label>Notification preferences</label>
              <div className="notification-toggle-row" role="group" aria-label="Notification preferences">
                <button type="button" className={`preference-toggle ${editingClient.notificationAppPush ? 'selected' : ''}`} onClick={() => updateEditing({ notificationAppPush: !editingClient.notificationAppPush })}>App Push</button>
                <button type="button" className={`preference-toggle ${editingClient.notificationEmail ? 'selected' : ''}`} onClick={() => updateEditing({ notificationEmail: !editingClient.notificationEmail })}>Email</button>
                <button type="button" className={`preference-toggle ${editingClient.notificationSms ? 'selected' : ''}`} onClick={() => updateEditing({ notificationSms: !editingClient.notificationSms })}>SMS</button>
              </div>
              <p className="micro-copy">Blue is selected. White is not selected. More than one can be selected.</p>
            </div>

            <div className="grid two controls-grid">
              <div className="form-row">
                <label htmlFor="editLanguage">Preferred language</label>
                <input id="editLanguage" value={editingClient.preferredLanguage ?? ''} onChange={(event) => updateEditing({ preferredLanguage: event.target.value })} placeholder="Optional" />
              </div>
              <div className="form-row">
                <label htmlFor="editContactTime">Preferred contact time</label>
                <input id="editContactTime" value={editingClient.preferredContactTime ?? ''} onChange={(event) => updateEditing({ preferredContactTime: event.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="editMedicalAlerts">Medical alerts / allergies</label>
              <textarea id="editMedicalAlerts" value={editingClient.allergiesMedicalAlerts ?? ''} onChange={(event) => updateEditing({ allergiesMedicalAlerts: event.target.value })} rows={3} />
            </div>

            <div className="form-row">
              <label htmlFor="editNotes">Notes</label>
              <textarea id="editNotes" value={editingClient.notes ?? ''} onChange={(event) => updateEditing({ notes: event.target.value })} rows={3} />
            </div>

            <div className="admin-data-divider" />

            <div className="section-heading-row compact-row">
              <div>
                <h3 className="subsection-title">Family members</h3>
                <p className="mini-copy">Listing only for now. Searching a family member name finds this main client record.</p>
              </div>
              <button type="button" className="pill" onClick={addFamilyMember}>Add family member</button>
            </div>
            <div className="family-member-list">
              {editingClient.familyMembers.map((member, index) => (
                <div className="family-member-row" key={member.id ?? index}>
                  <input value={member.fullName} onChange={(event) => updateFamilyMember(index, { fullName: event.target.value })} placeholder="Name" />
                  <DatePickerField value={member.dateOfBirth ?? ''} placeholder="Date of birth" ariaLabel="Choose family member date of birth" onChange={(nextDate) => updateFamilyMember(index, { dateOfBirth: nextDate })} />
                  <button type="button" className="pill danger-text" onClick={() => removeFamilyMember(index)}>Remove</button>
                </div>
              ))}
              {!editingClient.familyMembers.length && <p className="mini-copy">No family members listed yet.</p>}
            </div>

            <div className="admin-data-divider" />

            <div className="section-heading-row compact-row">
              <div>
                <h3 className="subsection-title">Documents</h3>
                <p className="mini-copy">Upload small demo documents for now. Bigger storage can be moved to proper file storage later.</p>
              </div>
              <label className="pill upload-pill">
                Upload document
                <input type="file" onChange={addDocument} />
              </label>
            </div>
            <div className="document-list">
              {editingClient.documents.map((document, index) => (
                <div className="document-row" key={document.id ?? index}>
                  <div>
                    <strong>{document.fileName}</strong>
                    <small>{formatBytes(document.fileSize)} · {document.mimeType || 'Document'}</small>
                    <input value={document.notes ?? ''} onChange={(event) => updateDocument(index, { notes: event.target.value })} placeholder="Document notes" />
                  </div>
                  <div className="document-actions">
                    {document.fileDataBase64 && <button type="button" className="pill" onClick={() => downloadDocument(document)}>Download</button>}
                    <button type="button" className="pill danger-text" onClick={() => removeDocument(index)}>Remove</button>
                  </div>
                </div>
              ))}
              {!editingClient.documents.length && <p className="mini-copy">No documents uploaded yet.</p>}
            </div>

            {!isNew && (
              <>
                <div className="admin-data-divider" />
                <div className="form-row">
                  <label htmlFor="newPassword">Set / reset client password</label>
                  <input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimum 6 characters" autoComplete="new-password" />
                  <p className="micro-copy">Current status: <strong>{client?.passwordSet ? 'Password set' : 'No password yet'}</strong>.</p>
                </div>
                <button type="button" onClick={setPassword} disabled={saving || newPassword.length < 6} className={`button primary admin-busy-button ${saving ? 'is-loading' : ''}`}>{saving && <span className="admin-spinner" aria-hidden="true" />}{client?.passwordSet ? 'Reset password' : 'Save password'}</button>

                <div className="admin-data-divider" />
                <button type="button" onClick={deleteClient} disabled={saving} className={`button danger admin-busy-button ${saving ? 'is-loading' : ''}`}>{saving && <span className="admin-spinner" aria-hidden="true" />}Delete client and linked bookings</button>
              </>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
