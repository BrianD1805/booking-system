'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import Link from 'next/link';
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
  hasClientLogin: boolean;
  loginPhone?: string;
  loginEmail?: string;
  verifiedAt?: string;
  passwordSet: boolean;
  bookingCount: number;
  latestBookingDate?: string;
  createdAt: string;
  updatedAt: string;
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

type EditingClient = Omit<AdminClient, 'hasClientLogin' | 'loginPhone' | 'loginEmail' | 'verifiedAt' | 'passwordSet' | 'bookingCount' | 'latestBookingDate' | 'createdAt' | 'updatedAt'>;

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

export default function AdminDataPage() {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);
  const [editingClient, setEditingClient] = useState<EditingClient | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Search for a client, or add a new client record.');
  const [error, setError] = useState('');
  const [pastBookingCount, setPastBookingCount] = useState<number | null>(null);
  const [pastBookingBeforeDate, setPastBookingBeforeDate] = useState('');

  const authHeaders = makeAdminAuthHeaders();

  async function loadClients(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers?query=${encodeURIComponent(nextQuery.trim())}`, {
        cache: 'no-store',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load clients.');
      const list = Array.isArray(payload.customers) ? payload.customers as AdminClient[] : [];
      setClients(list);
      const nextMessage = list.length ? `Loaded ${list.length} client record${list.length === 1 ? '' : 's'}.` : 'No clients found.';
      setMessage(nextMessage);
      showAdminToast(nextMessage, list.length ? 'info' : 'warning');
      if (selectedClient && !list.some((client) => client.id === selectedClient.id)) {
        setSelectedClient(null);
        setEditingClient(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load clients.');
    } finally {
      setLoading(false);
    }
  }

  function selectClient(client: AdminClient) {
    setSelectedClient(client);
    setEditingClient({
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
    });
    setNewPassword('');
    setMessage(`${client.fullName} selected.`);
  }

  function startNewClient() {
    setSelectedClient(null);
    setEditingClient(blankClient());
    setNewPassword('');
    setMessage('Adding a new client.');
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadClients(query);
  }

  async function saveClient() {
    if (!editingClient) return;
    setLoading(true);
    setError('');
    try {
      const isNew = editingClient.id === 'new';
      const url = isNew ? '/api/admin-data/customers' : `/api/admin-data/customers/${encodeURIComponent(editingClient.id)}`;
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(editingClient)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not save client.');
      const client = payload.customer as AdminClient;
      setSelectedClient(client);
      selectClient(client);
      setClients((current) => {
        const without = current.filter((item) => item.id !== client.id);
        return [client, ...without].slice(0, 50);
      });
      showAdminToast(isNew ? 'Client added.' : 'Client saved.');
      setMessage(isNew ? 'Client added.' : 'Client saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save client.');
    } finally {
      setLoading(false);
    }
  }

  async function setPassword() {
    if (!selectedClient || !newPassword) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(selectedClient.id)}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ password: newPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not set password.');
      const client = payload.customer as AdminClient;
      setNewPassword('');
      selectClient(client);
      setClients((current) => current.map((item) => item.id === client.id ? client : item));
      showAdminToast(`Password saved for ${client.fullName}.`);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Could not set password.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient() {
    if (!selectedClient) return;
    const confirmed = window.confirm(`Delete ${selectedClient.fullName}, their client login, family listing, documents, sessions, OTPs and linked bookings? This cannot be undone.`);
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(selectedClient.id)}?confirm=DELETE`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not delete client.');
      setSelectedClient(null);
      setEditingClient(null);
      setClients((current) => current.filter((client) => client.id !== selectedClient.id));
      setMessage(`Deleted client data. Bookings removed: ${payload.result?.deletedBookings ?? 0}.`);
      showAdminToast('Client deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete client.');
    } finally {
      setLoading(false);
    }
  }

  async function checkPastBookings() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-data/bookings/past', {
        cache: 'no-store',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not check past bookings.');
      const count = Number(payload.summary?.pastBookingCount ?? 0);
      const beforeDate = String(payload.summary?.beforeDate ?? 'today');
      setPastBookingCount(count);
      setPastBookingBeforeDate(beforeDate);
      showAdminToast(count ? `${count} past booking${count === 1 ? '' : 's'} found.` : 'No past bookings found.', 'info');
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Could not check past bookings.');
    } finally {
      setLoading(false);
    }
  }

  async function deletePastBookings() {
    const confirmed = window.confirm('Remove all bookings before today for the demo? This keeps clients and future bookings, but the deleted past bookings cannot be restored from this tool.');
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-data/bookings/past?confirm=DELETE', {
        method: 'DELETE',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not remove past bookings.');
      const deleted = Number(payload.result?.deletedBookings ?? 0);
      setPastBookingCount(0);
      showAdminToast(`Removed ${deleted} past booking${deleted === 1 ? '' : 's'}.`);
      await loadClients(query);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove past bookings.');
    } finally {
      setLoading(false);
    }
  }

  function updateEditing(patch: Partial<EditingClient>) {
    if (!editingClient) return;
    setEditingClient({ ...editingClient, ...patch });
  }

  function addFamilyMember() {
    if (!editingClient) return;
    updateEditing({ familyMembers: [...editingClient.familyMembers, { id: `fam-local-${Date.now()}`, fullName: '', dateOfBirth: '' }] });
  }

  function updateFamilyMember(index: number, patch: Partial<ClientFamilyMember>) {
    if (!editingClient) return;
    const next = editingClient.familyMembers.map((member, memberIndex) => memberIndex === index ? { ...member, ...patch } : member);
    updateEditing({ familyMembers: next });
  }

  function removeFamilyMember(index: number) {
    if (!editingClient) return;
    updateEditing({ familyMembers: editingClient.familyMembers.filter((_, memberIndex) => memberIndex !== index) });
  }

  async function addDocument(event: ChangeEvent<HTMLInputElement>) {
    if (!editingClient) return;
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
    if (!editingClient) return;
    const next = editingClient.documents.map((document, documentIndex) => documentIndex === index ? { ...document, ...patch } : document);
    updateEditing({ documents: next });
  }

  function removeDocument(index: number) {
    if (!editingClient) return;
    updateEditing({ documents: editingClient.documents.filter((_, documentIndex) => documentIndex !== index) });
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />

      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Clients · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Clients.</h1>
          <p className="hero-copy tight-copy">Search, add, edit and safely manage client records, family listings, documents, contact preferences and notes.</p>
        </div>
        <div className="command-actions">
          <Link className="pill" href="/admin">Back to diary</Link>
          <button type="button" onClick={startNewClient} disabled={loading} className="button primary large-cta">Add client</button>
          <button type="button" onClick={() => loadClients()} disabled={loading} className={`button secondary large-cta admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Load clients</button>
        </div>
      </section>

      <section className="card clean-panel admin-data-panel clients-search-panel">
        <div className="grid two controls-grid">
          <div className="form-row">
            <label>Admin security</label>
            <div className="readonly-admin-security">Master key and staff login verified for this browser session.</div>
            <p className="micro-copy">All client adds, edits, deletes, password changes, document updates and family listing changes are recorded in the audit trail.</p>
          </div>
          <form className="form-row" onSubmit={handleSearch}>
            <label htmlFor="clientQuery">Search clients</label>
            <div className="inline-action-row">
              <input id="clientQuery" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Client or family member name, phone or email" />
              <button type="submit" disabled={loading} className={`pill admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Search</button>
            </div>
          </form>
        </div>
        {error && <div className="notice warning" role="alert">{error}</div>}
        {!error && message && <div className="notice soft" role="status">{message}</div>}
      </section>

      <section className="card clean-panel admin-data-panel">
        <div className="section-heading-row compact-row">
          <div>
            <h2 className="section-title compact">Demo cleanup</h2>
            <p className="mini-copy">Remove old past bookings before a demo without deleting client records or future appointments.</p>
          </div>
          <div className="command-actions">
            <button type="button" onClick={checkPastBookings} disabled={loading} className={`pill admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Check past bookings</button>
            <button type="button" onClick={deletePastBookings} disabled={loading || pastBookingCount === 0} className={`button danger admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Remove past bookings</button>
          </div>
        </div>
        <p className="micro-copy">
          {pastBookingCount === null ? 'This only targets bookings dated before today.' : `${pastBookingCount} past booking${pastBookingCount === 1 ? '' : 's'} before ${pastBookingBeforeDate || 'today'}.`}
        </p>
      </section>

      <section className="admin-data-grid clients-admin-grid">
        <div className="card clean-panel">
          <div className="section-heading-row compact-row">
            <div>
              <h2 className="section-title compact">Search results</h2>
              <p className="mini-copy">Search includes family member names and opens the main client record.</p>
            </div>
          </div>

          <div className="customer-data-list clients-list">
            {clients.map((client) => (
              <button key={client.id} className={`customer-data-card client-row-card ${selectedClient?.id === client.id ? 'selected' : ''}`} type="button" onClick={() => selectClient(client)}>
                <strong>{client.fullName}</strong>
                <span>{client.phone} · {client.email}</span>
                <small>{client.bookingCount} booking{client.bookingCount === 1 ? '' : 's'} · {client.familyMembers?.length ?? 0} family · {client.documents?.length ?? 0} document{client.documents?.length === 1 ? '' : 's'}</small>
              </button>
            ))}
            {!clients.length && <p className="mini-copy">No clients loaded yet. Search above or add a new client.</p>}
          </div>
        </div>

        <div className="card clean-panel clients-editor-panel">
          <div className="section-heading-row compact-row">
            <div>
              <h2 className="section-title compact">{editingClient?.id === 'new' ? 'Add client' : 'Edit client'}</h2>
              <p className="mini-copy">Billing fields are deliberately left for the billing module stage.</p>
            </div>
            {editingClient && <button type="button" onClick={saveClient} disabled={loading} className={`button primary admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}{editingClient.id === 'new' ? 'Save new client' : 'Save client'}</button>}
          </div>

          {editingClient ? (
            <div className="admin-data-editor clients-editor">
              <div className="grid two controls-grid">
                <div className="form-row">
                  <label htmlFor="editFullName">Full name</label>
                  <input id="editFullName" value={editingClient.fullName} onChange={(event) => updateEditing({ fullName: event.target.value })} />
                </div>
                <div className="form-row">
                  <label htmlFor="editDob">Date of birth</label>
                  <input id="editDob" type="date" value={editingClient.dateOfBirth ?? ''} onChange={(event) => updateEditing({ dateOfBirth: event.target.value })} />
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
                <p className="micro-copy">More than one can be selected.</p>
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
                    <input type="date" value={member.dateOfBirth ?? ''} onChange={(event) => updateFamilyMember(index, { dateOfBirth: event.target.value })} />
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

              {editingClient.id !== 'new' && (
                <>
                  <div className="admin-data-divider" />
                  <div className="form-row">
                    <label htmlFor="newPassword">Set / reset client password</label>
                    <input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimum 6 characters" autoComplete="new-password" />
                    <p className="micro-copy">Current status: <strong>{selectedClient?.passwordSet ? 'Password set' : 'No password yet'}</strong>.</p>
                  </div>
                  <button type="button" onClick={setPassword} disabled={loading || newPassword.length < 6} className={`button primary admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}{selectedClient?.passwordSet ? 'Reset password' : 'Save password'}</button>

                  <div className="admin-data-divider" />
                  <button type="button" onClick={deleteClient} disabled={loading} className={`button danger admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Delete client and linked bookings</button>
                </>
              )}
            </div>
          ) : (
            <p className="mini-copy">Select a client from the list, or click Add client.</p>
          )}
        </div>
      </section>
    </main>
  );
}
