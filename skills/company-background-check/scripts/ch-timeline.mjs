// Build a bounded timeline from the responses already fetched by ch-check.
const SITE = 'https://find-and-update.company-information.service.gov.uk';
const date = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value ? value : null;
};
const transactionId = path => typeof path === 'string' ? path.match(/\/filing-history\/([^/?#]+)/)?.[1] || null : null;
const transactionKey = tx => transactionId(tx.links?.filing) || tx;
const removed = f => (f.annotations || []).some(a => /\b(remov(?:ed|al)|rectif(?:ied|ication)|expunged|replaced)\b/i.test(`${a.description || ''} ${a.annotation || ''}`));
const creationTx = t => /^(?:MR01|create-charge-with(?:out)?-deed)$/i.test(t.filing_type || '');
const satisfactionTx = t => /^(?:MR04|satisfy-charge-(?:full|part))$/i.test(t.filing_type || '');
const satisfactionFiling = f => f.type === 'MR04' || /^mortgage-satisfy-charge/.test(f.description || '');
const filingExtent = value => /satisfy-charge-full/i.test(value || '') ? ' in full' : /satisfy-charge-part/i.test(value || '') ? ' in part' : '';
const registerExtent = status => /^(?:satisfied|fully-satisfied)$/.test(status || '') ? ' in full' : status === 'part-satisfied' ? ' in part' : '';
const compatibleExtents = (a, b) => !a || !b || a === b;
// The filing date and the register's delivered_on can differ by a day around processing cut-offs.
const withinADay = (a, b) => a && b && Math.abs(Date.parse(a) - Date.parse(b)) <= 86_400_000;
// Companies House appends the replaced form's type, as in RP01SH01.
const replacementType = type => /^RP0[14]/i.test(type || '');
const replacement = f => replacementType(f.type) || /(?:^|-)(?:second|replacement|replaced|corrected)(?:-|$)/i.test(f.description || '');

export function buildTimeline({ accounts, confirmationStatement, number, filings, charges, today = new Date().toISOString().slice(0, 10) }) {
  const items = filings?.items || [], register = charges?.items || [], limits = new Set(), events = [], seen = new Set();
  const profileUrl = `${SITE}/company/${number}`, historyUrl = `${profileUrl}/filing-history`;
  const pdf = id => id ? `${historyUrl}/${encodeURIComponent(id)}/document?format=pdf&download=0` : null;
  const filingUrl = f => pdf(f?.transaction_id) || historyUrl;
  const periods = [accounts.last_made_up_to, ...items.filter(f => f.category === 'accounts' && f.type === 'AA' && !replacement(f) && !removed(f)).map(f => f.description_values?.made_up_date)];
  let anchor = periods.map(date).filter(d => d && d <= today).sort().at(-1) || null;
  if (anchor && anchor === date(accounts.last_made_up_to) && items.some(f => f.category === 'accounts' && f.type === 'AA' && date(f.description_values?.made_up_date) === anchor && removed(f)) && !items.some(f => f.category === 'accounts' && f.type === 'AA' && date(f.description_values?.made_up_date) === anchor && !removed(f) && !replacement(f))) {
    limits.add('The profile year-end matches removed or rectified accounts; the timeline cutoff needs manual confirmation.');
    anchor = null;
  }
  if (!anchor) limits.add('Latest accounts year-end unavailable; the timeline cannot be bounded to events after the accounts.');
  for (const [label, payload] of [['Filing history', filings], ['Charge register', charges]]) {
    if (!payload) limits.add(`${label} unavailable.`);
    else if (Number(payload.total_count) > (payload.items || []).length) limits.add(`${label} is truncated; earlier events may be missing.`);
  }
  const add = (event, identity) => {
    event.effective_date = date(event.effective_date); event.filed_date = date(event.filed_date); event.due_date = date(event.due_date);
    const eventDate = event.effective_date || event.due_date;
    if (eventDate && (eventDate > today || (anchor && eventDate <= anchor))) return;
    if (!eventDate) {
      if (event.filed_date && (event.filed_date > today || (anchor && event.filed_date <= anchor))) return;
      limits.add('Some events have no effective date; their position relative to the accounts year-end is uncertain.');
    }
    if (event.filed_date && event.filed_date > today) return;
    if (seen.has(identity)) return;
    seen.add(identity); events.push(event);
  };
  const chargeFor = f => {
    const id = String(f.description_values?.charge_number ?? '').replace(/\s/g, '').toUpperCase();
    const linked = register.filter(c => f.transaction_id && (c.transactions || []).some(t => transactionId(t.links?.filing) === f.transaction_id));
    if (linked.length === 1) return linked[0];
    if (linked.length > 1) return null;
    const matches = register.filter(c => {
      const ids = [c.charge_code, c.charge_number].filter(x => x != null).map(x => String(x).replace(/\s/g, '').toUpperCase());
      return id && ids.includes(id);
    });
    return matches.length === 1 ? matches[0] : null;
  };
  const keyFor = c => c.charge_code || (c.charge_number != null ? String(c.charge_number) : c.id || c.links?.self || null);
  const detail = c => c?.links?.self ? SITE + c.links.self : `${profileUrl}/charges`;
  const chargeEvents = new Set(), handledTransactions = new Set(), removedTransactions = new Set(), partialCharges = new Set();
  const statusFromFiling = new Set();
  const findTransaction = (f, charge, kind) => {
    const transactions = charge?.transactions || [];
    const linked = other => other.transaction_id && transactions.find(t => transactionId(t.links?.filing) === other.transaction_id);
    const direct = linked(f), filedOn = date(f.date);
    if (direct || kind !== 'charge_satisfied' || !filedOn) return direct;

    // Without a link, require a unique pairing by charge, filing date and compatible extent.
    const matches = transactions.filter(t => satisfactionTx(t) && !t.links?.filing
      && withinADay(date(t.delivered_on), filedOn) && compatibleExtents(filingExtent(f.description), filingExtent(t.filing_type)));
    if (matches.length !== 1) return null;
    const match = matches[0];
    const competing = items.some(other => other !== f && (!f.transaction_id || other.transaction_id !== f.transaction_id)
      && satisfactionFiling(other) && withinADay(date(other.date), date(match.delivered_on))
      && !replacement(other) && !removed(other) && compatibleExtents(filingExtent(other.description), filingExtent(match.filing_type))
      && !linked(other) && chargeFor(other) === charge);
    return competing ? null : match;
  };
  // Prefer the earliest processed original when duplicate dated officer filings exist.
  const orderedItems = [...items].sort((a, b) => (date(a.date) || '9999').localeCompare(date(b.date) || '9999'));
  for (const f of orderedItems) {
    const d = f.description || '', v = f.description_values || {}, type = f.type || '';
    const relevant = /^(?:MR01|MR04|AP01|AP02|TM01|PSC0[1-7]|SH01)$/i.test(type) || /^(?:mortgage-(?:create|satisfy)|appoint-.*director|termination-.*director|notification-of-a-person-with-significant-control|change-to-a-person-with-significant-control|cessation-of-a-person-with-significant-control)/.test(d);
    const named = `${type || 'Filing'} filed ${date(f.date) || 'on an unknown date'}`;
    if (replacement(f)) { if (relevant || (!anchor || !date(f.date) || f.date > anchor) && replacementType(type)) limits.add(`${named} replaces or corrects an earlier filing and is not counted as a new event. Read it for the corrected details: ${filingUrl(f)}`); if (f.transaction_id) removedTransactions.add(f.transaction_id); continue; }
    if (relevant && removed(f)) { limits.add(`${named} has a removal or rectification annotation and is not counted. Check it before relying on it: ${filingUrl(f)}`); if (f.transaction_id) removedTransactions.add(f.transaction_id); continue; }
    if (relevant && ((f.annotations || []).length || (f.associated_filings || []).length)) limits.add('Some relevant filings have annotations or associated filings; check for corrections before relying on them.');
    let kind, summary, effective, extra = {}, identity = f.transaction_id ? `filing:${f.transaction_id}` : `filing:${JSON.stringify(f)}`;
    if (/^mortgage-create/.test(d) || type === 'MR01') { kind = 'charge_created'; summary = 'Charge created'; effective = v.charge_creation_date; }
    else if (satisfactionFiling(f)) { kind = 'charge_satisfied'; effective = v.mortgage_satisfaction_date; }
    else if ((/^appoint-.*director/.test(d) || /^(AP01|AP02)$/.test(type))) { kind = 'director_appointed'; summary = `Director appointed${v.officer_name ? `: ${v.officer_name}` : ''}`; effective = v.appointment_date; }
    else if (/^termination-.*director/.test(d) || type === 'TM01') { kind = 'director_terminated'; summary = `Director terminated${v.officer_name ? `: ${v.officer_name}` : ''}`; effective = v.termination_date; }
    else if (/^notification-of-a-(?:person|super-secure-person)-with-significant-control(?:-|$)/.test(d) && !/statement/.test(d) || /^PSC0[1-3]$/.test(type)) { kind = 'psc_notified'; summary = `Person with significant control notified${v.psc_name ? `: ${v.psc_name}` : ''}`; effective = v.notification_date; }
    else if (/^change-to-a-person-with-significant-control/.test(d) || /^PSC0[4-6]$/.test(type)) { kind = 'psc_changed'; summary = `Person with significant control details changed${v.psc_name ? `: ${v.psc_name}` : ''}`; effective = v.change_date; }
    else if (/^cessation-of-a-(?:person|super-secure-person)-with-significant-control/.test(d) || type === 'PSC07') { kind = 'psc_ceased'; summary = `Person with significant control ceased${v.psc_name ? `: ${v.psc_name}` : ''}`; effective = v.cessation_date; }
    else if (type === 'SH01') { kind = 'share_allotment'; summary = 'Share allotment'; effective = v.date || v.allotment_date || v.made_up_date; }
    else continue;
    if ((kind === 'director_appointed' || kind === 'director_terminated') && date(effective) && v.officer_name?.trim()) identity = `${kind}:${date(effective)}:${v.officer_name.trim().replace(/\s+/g, ' ').toUpperCase()}`;
    let filed = f.date, url = filingUrl(f);
    if (kind.startsWith('charge_')) {
      const c = chargeFor(f), key = c ? keyFor(c) : v.charge_number != null ? String(v.charge_number).replace(/\s/g, '').toUpperCase() : null;
      const transaction = findTransaction(f, c, kind);
      if (transaction) handledTransactions.add(transactionKey(transaction));
      if (key) extra.charge_code = c?.charge_code || key;
      if (c?.persons_entitled?.length) extra.lenders = c.persons_entitled.map(p => p.name).filter(Boolean);
      if (c) extra.register_url = detail(c);
      filed ||= transaction?.delivered_on;
      if (kind === 'charge_created') {
        effective ||= c?.created_on;
        extra.document_url = pdf(f.transaction_id || transactionId(transaction?.links?.filing));
        if (key) { identity = `${kind}:${key}`; chargeEvents.add(identity); }
      } else {
        const transactionExtent = filingExtent(transaction?.filing_type);
        let extent = filingExtent(d) || transactionExtent;
        const satisfiedOn = date(c?.satisfied_on);
        if (!date(effective) && satisfiedOn && (!date(filed) || filed >= satisfiedOn)) {
          const statusExtent = registerExtent(c.status);
          const transactions = (c.transactions || []).filter(satisfactionTx);
          const exact = transaction && extent && extent === statusExtent
            && compatibleExtents(transactionExtent, extent)
            && transactions.filter(tx => transactionExtent ? filingExtent(tx.filing_type) === extent
              : compatibleExtents(filingExtent(tx.filing_type), extent)).length === 1;
          // Match the register date to the same stage of satisfaction.
          if (compatibleExtents(extent, statusExtent) && (exact || transactions.length <= 1)) {
            effective = satisfiedOn;
            extent ||= statusExtent;
          }
        }
        summary = `Charge satisfied${extent}`;
        if (c && extent && extent === registerExtent(c.status)) statusFromFiling.add(c);
        if (key && extent === ' in part') partialCharges.add(key);
        if (key && date(effective)) identity = `${kind}:${key}:${effective}:${summary}`;
      }
      if (!f.transaction_id && c) url = detail(c);
    }
    add({ kind, summary, effective_date: effective, filed_date: filed, due_date: null, url, ...extra }, identity);
  }
  for (const c of register) {
    const key = keyFor(c), txs = c.transactions || [], lenders = (c.persons_entitled || []).map(p => p.name).filter(Boolean);
    const emit = (kind, effective, transaction, summary) => {
      const tid = transactionId(transaction?.links?.filing);
      if ((transaction && handledTransactions.has(transactionKey(transaction))) || (tid && removedTransactions.has(tid))) return;
      if (kind === 'charge_created' && key && chargeEvents.has(`${kind}:${key}`)) return;
      if (kind === 'charge_satisfied' && key && date(effective) && events.some(e => e.kind === kind && e.charge_code === key && e.effective_date === date(effective) && e.summary === summary)) return;
      const id = transactionId(transaction?.links?.filing), extra = { ...(key && { charge_code: c.charge_code || key }), ...(lenders.length && { lenders }) };
      if (kind === 'charge_created') extra.document_url = pdf(id);
      if (kind === 'charge_satisfied' && id) extra.register_url = detail(c);
      const source = id || (transaction && `${transaction.filing_type}:${date(transaction.delivered_on) || ''}`) || effective || '';
      add({ kind, summary, effective_date: effective, filed_date: transaction?.delivered_on || (kind === 'charge_created' ? c.delivered_on : null), due_date: null, url: kind === 'charge_satisfied' && id ? pdf(id) : detail(c), ...extra }, `register:${kind}:${key || JSON.stringify(c)}:${source}`);
    };
    emit('charge_created', c.created_on, txs.find(creationTx), 'Charge created');
    if (c.satisfied_on || /satisfied/.test(c.status || '') || txs.some(satisfactionTx)) {
      const satisfactionTxs = txs.filter(satisfactionTx);
      const extentOf = tx => filingExtent(tx.filing_type);
      const suffix = registerExtent(c.status);
      const pending = satisfactionTxs.filter(tx => !handledTransactions.has(transactionKey(tx)) && !removedTransactions.has(transactionId(tx.links?.filing)));
      const compatible = pending.filter(tx => extentOf(tx) && extentOf(tx) === suffix);
      const unknown = pending.filter(tx => !extentOf(tx));
      const canMatchUnknown = compatible.length === 0 && unknown.length === 1
        && (satisfactionTxs.length === 1 || (suffix === ' in full' && partialCharges.has(key)));
      const match = compatible.length === 1 ? compatible[0] : canMatchUnknown ? unknown[0] : null;
      const satisfiedOn = date(c.satisfied_on), deliveredOn = date(match?.delivered_on);
      const datedMatch = satisfiedOn && (!deliveredOn || deliveredOn >= satisfiedOn) ? match : null;
      for (const tx of pending) {
        const extent = extentOf(tx) || (tx === datedMatch ? suffix : '');
        if (tx !== datedMatch) limits.add('A charge satisfaction transaction has no individual effective date; check the filing.');
        emit('charge_satisfied', tx === datedMatch ? satisfiedOn : null, tx, tx === datedMatch ? `Charge satisfied${extent}` : `Charge satisfaction recorded${extent}`);
      }
      if (satisfiedOn && !datedMatch) emit('charge_satisfied', satisfiedOn, null, `Charge satisfied${suffix}`);
      else if (!satisfactionTxs.length && !satisfiedOn && !statusFromFiling.has(c)) emit('charge_satisfied', null, null, `Charge satisfied${suffix}`);
    }
  }
  for (const [record, kind, summary] of [[accounts, 'accounts_overdue', 'Accounts overdue'], [confirmationStatement, 'confirmation_overdue', 'Confirmation statement overdue']]) {
    if (record?.overdue) add({ kind, summary, effective_date: null, filed_date: null, due_date: record.next_due, url: profileUrl }, kind);
  }
  events.sort((a, b) => (a.effective_date || a.due_date || a.filed_date || '9999').localeCompare(b.effective_date || b.due_date || b.filed_date || '9999') || a.kind.localeCompare(b.kind));
  return { accounts_year_end: anchor, events, limits: [...limits] };
}
