function autoAssignTraveler(travelerKey, allUsers = []) {
  if (!allUsers || !allUsers.length) {
    try {
      const st = JSON.parse(localStorage.getItem('dream_destination_workflow_v5') || 'null');
      if (st && Array.isArray(st.users)) allUsers = st.users;
    } catch (_) {}
  }

  const partners = (allUsers || []).filter(u => u.role === 'Travel Partner' && u.status !== 'Inactive' && u.status !== 'Suspended');
  const supports = (allUsers || []).filter(u => (u.role === 'Support Executive' || u.role === 'Support') && u.status !== 'Inactive' && u.status !== 'Suspended');

  let asgStore = {};
  try {
    asgStore = JSON.parse(localStorage.getItem('dd_traveler_assignments_v1') || '{}');
  } catch (_) {}

  // Count existing assignments per partner & support
  const partnerCounts = {};
  partners.forEach(p => { partnerCounts[p.id || p.email?.toLowerCase()] = 0; });

  const supportCounts = {};
  supports.forEach(s => { supportCounts[s.id || s.email?.toLowerCase()] = 0; });

  Object.values(asgStore).forEach(asg => {
    if (asg && asg.partnerId && partnerCounts[asg.partnerId] !== undefined) partnerCounts[asg.partnerId]++;
    if (asg && asg.supportId && supportCounts[asg.supportId] !== undefined) supportCounts[asg.supportId]++;
  });

  // Pick partner with fewest travelers
  let chosenPartner = null;
  if (partners.length > 0) {
    chosenPartner = partners.reduce((minP, p) => {
      const pid = p.id || p.email?.toLowerCase();
      const minId = minP.id || minP.email?.toLowerCase();
      return (partnerCounts[pid] < partnerCounts[minId]) ? p : minP;
    }, partners[0]);
  }

  // Pick support executive with fewest travelers
  let chosenSupport = null;
  if (supports.length > 0) {
    chosenSupport = supports.reduce((minS, s) => {
      const sid = s.id || s.email?.toLowerCase();
      const minId = minS.id || minS.email?.toLowerCase();
      return (supportCounts[sid] < supportCounts[minId]) ? s : minS;
    }, supports[0]);
  }

  const assignment = {
    partnerId: chosenPartner ? (chosenPartner.id || chosenPartner.email) : null,
    partnerName: chosenPartner ? chosenPartner.name : 'Unassigned',
    supportId: chosenSupport ? (chosenSupport.id || chosenSupport.email) : null,
    supportName: chosenSupport ? chosenSupport.name : 'Unassigned',
    assignedAt: new Date().toISOString()
  };

  if (travelerKey) {
    asgStore[travelerKey] = assignment;
    localStorage.setItem('dd_traveler_assignments_v1', JSON.stringify(asgStore));
  }

  return assignment;
}
window.autoAssignTraveler = autoAssignTraveler;

const CRUD = {
  async handleFormSubmit(e, resource, redirectUrl) {
    e.preventDefault();
    if (!canCrudOperate()) return;
    const form = e.target;
    const formData = new FormData(form);
    const dataObj = Object.fromEntries(formData.entries());
    // Strip empty strings — but keep numeric zeros
    Object.keys(dataObj).forEach((key) => {
      if (dataObj[key] === '') delete dataObj[key];
    });

    if (dataObj.monthlySalary !== undefined) {
      dataObj.monthlySalary = Number(dataObj.monthlySalary) || 0;
    }

    try {
      const id = formData.get('id');
      if (resource === 'users' && !id && !dataObj.password) {
        dataObj.password = 'password123';
      }

      // Persist salary in dedicated store so backend sync doesn't erase custom edits
      if (resource === 'users' && dataObj.monthlySalary !== undefined) {
        try {
          const salStore = JSON.parse(localStorage.getItem('dd_user_salaries_v1') || '{}');
          if (id) salStore[id] = Number(dataObj.monthlySalary);
          if (dataObj.email) salStore[dataObj.email.toLowerCase()] = Number(dataObj.monthlySalary);
          localStorage.setItem('dd_user_salaries_v1', JSON.stringify(salStore));
        } catch (_) {}
      }

      // Handle Traveler Partner & Support Executive assignment saving & auto balancing
      if (resource === 'users') {
        const partnerId = dataObj.assignedPartnerId;
        const supportId = dataObj.assignedSupportId;
        const key = id || dataObj.email?.toLowerCase();
        
        let asgStore = {};
        try {
          asgStore = JSON.parse(localStorage.getItem('dd_traveler_assignments_v1') || '{}');
        } catch (_) {}

        if (key) {
          const allUsers = (this.currentUsers && this.currentUsers.length) ? this.currentUsers : (JSON.parse(localStorage.getItem('dream_destination_workflow_v5') || '{}').users || []);
          const partnerObj = allUsers.find(u => (u.id === partnerId || u.email === partnerId || u.name === partnerId));
          const supportObj = allUsers.find(u => (u.id === supportId || u.email === supportId || u.name === supportId));

          if (partnerId || supportId) {
            asgStore[key] = {
              partnerId: partnerId || (asgStore[key]?.partnerId || null),
              partnerName: partnerObj ? partnerObj.name : (partnerId || asgStore[key]?.partnerName || 'Unassigned'),
              supportId: supportId || (asgStore[key]?.supportId || null),
              supportName: supportObj ? supportObj.name : (supportId || asgStore[key]?.supportName || 'Unassigned'),
              updatedAt: new Date().toISOString()
            };
            localStorage.setItem('dd_traveler_assignments_v1', JSON.stringify(asgStore));
          } else if (dataObj.role === 'Traveler' || (!id && (dataObj.role === 'Traveler' || !dataObj.role))) {
            autoAssignTraveler(key, allUsers);
          }
        }
      }

      if (id) {
        try {
          await ApiClient.patch(`/${resource}/${id}`, dataObj);
        } catch (apiErr) {
          console.warn(`ApiClient patch /${resource}/${id} failed, updating local state:`, apiErr.message);
        }
        try {
          ['dream_destination_workflow_v5', 'dd_workflow_state_v3'].forEach(key => {
            const st = JSON.parse(localStorage.getItem(key) || 'null');
            if (st && Array.isArray(st.users) && resource === 'users') {
              const u = st.users.find((x) => x.id === id);
              if (u) {
                Object.assign(u, dataObj);
                localStorage.setItem(key, JSON.stringify(st));
              }
            }
          });
        } catch (_) {}

        const navigate = () => { window.location.href = redirectUrl; };
        if (typeof showSuccessModal === 'function') {
          showSuccessModal('Updated Successfully', `${resource === 'users' ? 'User' : 'Record'} has been updated! Changes are now live.`, navigate);
        } else if (typeof Toast !== 'undefined') {
          Toast.success('Updated successfully!');
          setTimeout(navigate, 1000);
        } else {
          alert('Updated successfully!');
          navigate();
        }
      } else {
        try {
          await ApiClient.post(`/${resource}`, dataObj);
        } catch (apiErr) {
          console.warn(`ApiClient post /${resource} failed, adding to local state:`, apiErr.message);
        }
        try {
          ['dream_destination_workflow_v5', 'dd_workflow_state_v3'].forEach(key => {
            const st = JSON.parse(localStorage.getItem(key) || 'null');
            if (st && Array.isArray(st.users) && resource === 'users') {
              const newId = `USR-${Math.floor(100 + Math.random() * 900)}`;
              st.users.push({ id: newId, status: 'Active', joined: new Date().toISOString(), ...dataObj });
              localStorage.setItem(key, JSON.stringify(st));
            }
          });
        } catch (_) {}

        const navigate = () => { window.location.href = redirectUrl; };
        if (typeof showSuccessModal === 'function') {
          showSuccessModal('Created Successfully', `New ${resource === 'users' ? 'user account' : 'record'} created successfully.`, navigate);
        } else if (typeof Toast !== 'undefined') {
          Toast.success('Created successfully!');
          setTimeout(navigate, 1000);
        } else {
          alert('Created successfully!');
          navigate();
        }
      }
    } catch (err) {
      if (typeof Toast !== 'undefined') Toast.error(err.message);
      else alert(err.message);
    }
  },

  async loadRecordForEdit(resource) {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    let record = null;
    try {
      const res = await ApiClient.get(`/${resource}/${id}`);
      record = res.data || res;
    } catch (err) {
      console.warn(`ApiClient loadRecordForEdit failed for /${resource}/${id}, looking in local state:`, err.message);
    }

    if (!record || typeof record !== 'object' || !record.name) {
      try {
        ['dream_destination_workflow_v5', 'dd_workflow_state_v3'].forEach(key => {
          const st = JSON.parse(localStorage.getItem(key) || 'null');
          if (st && Array.isArray(st.users) && resource === 'users') {
            const u = st.users.find((x) => x.id === id);
            if (u) record = u;
          }
        });
      } catch (_) {}
    }

    if (!record) return;
    const form = document.querySelector('form');
    if (!form) return;

    Object.keys(record).forEach((key) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input && key !== 'password') {
        input.value = record[key] ?? '';
      }
    });

    if (resource === 'users') {
      try {
        const salStore = JSON.parse(localStorage.getItem('dd_user_salaries_v1') || '{}');
        const savedSal = (id && salStore[id] !== undefined) ? salStore[id] : (record.email && salStore[record.email.toLowerCase()] !== undefined ? salStore[record.email.toLowerCase()] : record.monthlySalary);
        const salInput = form.querySelector('[name="monthlySalary"]');
        if (salInput && savedSal !== undefined && savedSal !== null) {
          salInput.value = savedSal;
        }
      } catch (_) {}

      // Populate partner and support executive dropdowns
      try {
        const st = JSON.parse(localStorage.getItem('dream_destination_workflow_v5') || '{}');
        const allUsers = (this.currentUsers && this.currentUsers.length) ? this.currentUsers : (st.users || []);
        const partners = allUsers.filter(u => u.role === 'Travel Partner');
        const supports = allUsers.filter(u => u.role === 'Support Executive' || u.role === 'Support');
        
        const partnerSelect = form.querySelector('[name="assignedPartnerId"]');
        if (partnerSelect) {
          partnerSelect.innerHTML = '<option value="">-- Select Travel Partner --</option>' + 
            partners.map(p => `<option value="${p.id || p.email}">${p.name} (${p.email})</option>`).join('');
        }

        const supportSelect = form.querySelector('[name="assignedSupportId"]');
        if (supportSelect) {
          supportSelect.innerHTML = '<option value="">-- Select Support Executive --</option>' + 
            supports.map(s => `<option value="${s.id || s.email}">${s.name} (${s.email})</option>`).join('');
        }

        const asgStore = JSON.parse(localStorage.getItem('dd_traveler_assignments_v1') || '{}');
        const currentAsg = asgStore[id] || (record.email ? asgStore[record.email.toLowerCase()] : null);
        if (currentAsg) {
          if (partnerSelect && currentAsg.partnerId) partnerSelect.value = currentAsg.partnerId;
          if (supportSelect && currentAsg.supportId) supportSelect.value = currentAsg.supportId;
        }
      } catch (_) {}
    }

    if (!form.querySelector('input[name="id"]')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'id';
      hidden.value = id;
      form.appendChild(hidden);
    }
  },

  async deleteRecord(resource, id, name) {
    if (!canCrudOperate()) return;
    showConfirmModal(
      'Confirm Deletion',
      `Are you sure you want to permanently delete <strong>${name}</strong>? This cannot be undone.`,
      'Delete',
      'red',
      async () => {
        try {
          await ApiClient.delete(`/${resource}/${id}`);
          if (resource === 'users') {
            try {
              ['dream_destination_workflow_v5', 'dd_workflow_state_v3'].forEach(key => {
                const st = JSON.parse(localStorage.getItem(key) || 'null');
                if (st && Array.isArray(st.users)) {
                  st.users = st.users.filter((x) => x.id !== id);
                  localStorage.setItem(key, JSON.stringify(st));
                }
              });
            } catch (_) {}
            await this.renderUsers();
          }
          if (resource === 'trips') {
            try {
              ['dream_destination_workflow_v5', 'dd_workflow_state_v3'].forEach(key => {
                const st = JSON.parse(localStorage.getItem(key) || 'null');
                if (st && Array.isArray(st.trips)) {
                  const targetTrip = st.trips.find(x => x.id === id || x.requestId === id);
                  if (targetTrip && targetTrip.status === 'completed') {
                    if (typeof Toast !== 'undefined') Toast.warning('Completed trips cannot be deleted as they form part of historical records.');
                    else alert('Completed trips cannot be deleted.');
                    return;
                  }
                  st.trips = st.trips.filter((x) => x.id !== id && x.requestId !== id);
                  localStorage.setItem(key, JSON.stringify(st));
                }
              });
            } catch (_) {}
            if (window.DDWorkflow && typeof window.DDWorkflow.deleteTrip === 'function') {
              window.DDWorkflow.deleteTrip(id);
            }
            await this.renderTrips();
          }
          if (typeof Toast !== 'undefined') Toast.success(`${name} deleted successfully.`);
          else alert(`${name} deleted successfully.`);
        } catch (err) {
          if (typeof Toast !== 'undefined') Toast.error(`Delete failed: ${err.message}`);
          else alert(`Delete failed: ${err.message}`);
        }
      }
    );
  },

  async renderTrips() {
    const container = document.getElementById('trips-render-container') || document.getElementById('sa-trips-container');
    if (!container) return;
    let trips = [];
    try {
      const res = await ApiClient.get('/trips');
      trips = Array.isArray(res) ? res : (res.data || []);
    } catch (err) {
      console.warn('API get trips failed; using local workflow state fallback:', err.message);
    }

    try {
      ['dream_destination_workflow_v5', 'dd_workflow_state_v3'].forEach(key => {
        const st = JSON.parse(localStorage.getItem(key) || 'null');
        if (st && Array.isArray(st.trips)) {
          const tripMap = new Map();
          (trips || []).forEach(t => tripMap.set(t.id, t));
          (st.trips || []).forEach(t => {
            if (!tripMap.has(t.id)) tripMap.set(t.id, t);
          });
          trips = Array.from(tripMap.values());
        }
      });
    } catch (_) {}

    container.innerHTML = '';
    this.currentTrips = trips;
    this.renderTripStats(trips);

    if (!trips.length) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #64748b;">No trips found.</div>`;
      return;
    }

function isTripPaid(trip) {
  if (!trip) return false;
  if (trip.refundRecord && trip.refundRecord.processed) return true;
  if (trip.paymentStatus === 'Unpaid' || trip.paymentStatus === 'not_paid' || trip.isPaid === false || trip.paymentCompleted === false || trip.unpaid === true) return false;
  if (trip.paidAmount !== undefined && Number(trip.paidAmount) <= 0) return false;
  if (trip.paymentStatus === 'Paid' || trip.paymentStatus === 'completed' || trip.paid === true || trip.isPaid === true || trip.paymentCompleted === true) return true;
  if (trip.status === 'requested' || trip.requestStatus === 'Requested' || trip.status === 'planning') return false;
  return true;
}

    trips.forEach((trip) => {
      const status = tripDisplayStatus(trip);
      const isCancelled = status === 'Cancelled' || trip.status === 'cancelled';
      const ref = trip.refundRecord;
      const isRefunded = ref && ref.processed;
      const paid = isTripPaid(trip);
      const badgeClass = status === 'Completed' ? 'sa-tc-completed' : isCancelled ? 'sa-tc-cancelled' : status === 'Ongoing' || status === 'In Progress' ? 'sa-tc-ongoing' : 'sa-tc-upcoming';

      let actionButtons = `<button class="sa-tc-btn sa-tc-view" data-dd-action="route" data-dd-target="superuser_view_trip.html?id=${encodeURIComponent(trip.id)}" onclick="window.location.href='superuser_view_trip.html?id=${encodeURIComponent(trip.id)}'"><i data-icon="eye"></i> View</button>`;

      if (isCancelled) {
        if (!paid) {
          actionButtons += `<button class="sa-tc-btn" disabled style="background:#f1f5f9;color:#64748b;font-weight:600;opacity:0.85;cursor:not-allowed;" title="Trip was cancelled before payment was completed"><i data-icon="xcircle"></i> No Refund Required (Unpaid)</button>`;
        } else if (isRefunded) {
          actionButtons += `<button class="sa-tc-btn" style="background:#dcfce7;color:#15803d;font-weight:700;" onclick="window.openCancellationRefundModal('${escapeJS(trip.id)}')"><i data-icon="check"></i> Refunded ${window.formatMoney ? window.formatMoney(ref.refundAmount) : ('$' + ref.refundAmount)}</button>`;
        } else {
          actionButtons += `<button class="sa-tc-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;" onclick="window.openCancellationRefundModal('${escapeJS(trip.id)}')"><i data-icon="creditcard"></i> Process Refund</button>`;
        }
      } else if (status === 'Completed') {
        actionButtons += `<button class="sa-tc-btn" style="background:${trip.budgetShare?.disbursed ? '#e0f2fe' : 'linear-gradient(135deg,#10b981,#059669)'};color:${trip.budgetShare?.disbursed ? '#0369a1' : '#fff'};font-weight:700;" onclick="if(window.openBudgetShareModal){window.openBudgetShareModal('${escapeJS(trip.id)}');}"><i data-icon="dollar"></i> ${trip.budgetShare?.disbursed ? 'Shares Paid' : 'Disburse Share'}</button>
          <button class="sa-tc-btn sa-tc-delete" disabled style="opacity:0.5;cursor:not-allowed;" title="Completed trips cannot be deleted"><i data-icon="lock"></i> Protected</button>`;
      } else {
        actionButtons += `<button class="sa-tc-btn sa-tc-delete" onclick="CRUD.deleteRecord('trips', '${escapeJS(trip.id)}', '${escapeJS(trip.title)}')"><i data-icon="trash"></i> Delete</button>`;
      }

function getDestinationCoverPhoto(trip) {
  if (!trip) return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

  if (trip.coverImage || trip.imageUrl || trip.photoUrl || trip.image || trip.customPhoto) {
    return trip.coverImage || trip.imageUrl || trip.photoUrl || trip.image || trip.customPhoto;
  }

  const text = (String(trip.title || '') + ' ' + String(trip.destination || '') + ' ' + String(trip.notes || '')).toLowerCase();

  if (/swiss|alps|zurich|snow|iceland|norway|manali|himalaya|mountain|peak|ski/.test(text)) {
    return 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80';
  }
  if (/maldives|beach|island|hawaii|thailand|bali|goa|kerala|cancun|caribbean|coast|ocean|resort/.test(text)) {
    return 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80';
  }
  if (/japan|tokyo|kyoto|singapore|china|vietnam|asia|temple|pagoda|sakura/.test(text)) {
    return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
  }
  if (/paris|france|london|rome|italy|spain|amsterdam|greece|europe|eiffel|colosseum/.test(text)) {
    return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80';
  }
  if (/new york|nyc|dubai|chicago|city|skyline|urban|downtown|tower|los angeles/.test(text)) {
    return 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80';
  }
  if (/kenya|safari|africa|desert|egypt|canyon|wildlife|jungle|national park/.test(text)) {
    return 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80';
  }

  const fallbackPool = [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1476514525535-ce74f452623d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80'
  ];
  let hash = 0;
  const str = String(trip.id || trip.title || trip.destination || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return fallbackPool[Math.abs(hash) % fallbackPool.length];
}

      const cover = getDestinationCoverPhoto(trip);
      const cardHTML = `
        <div class="sa-trip-card" data-status="${escapeHTML(status)}" style="overflow:hidden;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);background:var(--card,#fff);display:flex;flex-direction:column;">
          <div style="position:relative;height:140px;overflow:hidden;">
            <img src="${cover}" alt="${escapeHTML(trip.title)}" style="width:100%;height:100%;object-fit:cover;filter:brightness(0.85);" />
            <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 70%);"></div>
            <div style="position:absolute;top:12px;left:12px;z-index:2;">
              <span class="sa-tc-badge ${badgeClass}">${escapeHTML(status)}</span>
            </div>
            <div style="position:absolute;bottom:10px;left:12px;right:12px;z-index:2;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;">
              <i data-icon="mappin" style="color:#38bdf8;"></i> ${escapeHTML(trip.destination || 'Destination')}
            </div>
          </div>
          <div style="padding:16px;display:flex;flex-direction:column;flex:1;">
            <h3 class="sa-tc-title" style="margin:0 0 10px;font-size:17px;font-weight:800;color:var(--foreground,#0f172a);">${escapeHTML(trip.title)}</h3>
            <div class="sa-tc-details" style="margin-bottom:14px;">
              <div class="sa-tc-detail"><i data-icon="calendar"></i> ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</div>
              <div class="sa-tc-detail"><i data-icon="users"></i> ${trip.travelersCount || 1} Travelers &bull; ${escapeHTML(trip.travelerName || 'Traveler')}</div>
              <div class="sa-tc-detail"><i data-icon="compass"></i> Guide: ${escapeHTML(trip.guide?.name || 'Unassigned')}</div>
            </div>
            <div class="sa-tc-footer" style="margin-top:auto;padding-top:12px;border-top:1px solid var(--border,#e2e8f0);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div class="sa-tc-price" style="font-size:18px;font-weight:800;color:#0ea5e9;">${window.formatMoney ? window.formatMoney(Number(trip.budget || 0)) : ('₹' + Number(trip.budget || 0).toLocaleString())}</div>
              <div class="sa-tc-actions" style="display:flex;gap:6px;flex-wrap:wrap;">
                ${actionButtons}
              </div>
            </div>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', cardHTML);
    });
    this.initIconsInContainer(container);
    this.applyTripFilters();
  },

  renderTripStats(trips) {
    const cards = document.querySelectorAll('.sa-stats-grid-5 .sa-sw-count');
    if (cards[0]) cards[0].textContent = trips.length;
    if (cards[1]) cards[1].textContent = trips.filter((trip) => trip.status === 'ongoing').length;
    if (cards[2]) cards[2].textContent = trips.filter((trip) => ['requested', 'planning'].includes(trip.status)).length;
    if (cards[3]) cards[3].textContent = trips.filter((trip) => trip.status === 'completed').length;
    
    let totalRev = 0;
    if (typeof tripRevenue === 'function') {
      totalRev = tripRevenue(trips);
    } else {
      totalRev = (trips || []).reduce((sum, trip) => {
        if (!trip) return sum;
        const isCancelled = trip.status === 'cancelled';
        const ref = trip.refundRecord;
        const isRefunded = ref && ref.processed;
        if (isCancelled) {
          if (isRefunded) {
            const feeAmt = Number(ref.cancellationFeeAmount !== undefined ? ref.cancellationFeeAmount : ((Number(trip.budget || 0) * (ref.cancellationFeePercent || 0)) / 100));
            return sum + (isNaN(feeAmt) ? 0 : feeAmt);
          }
          return sum;
        }
        if (typeof isTripPaid === 'function' && !isTripPaid(trip)) return sum;
        return sum + Number(trip.budget || trip.totalAmount || trip.paidAmount || 0);
      }, 0);
    }

    if (cards[4]) cards[4].textContent = window.formatMoney ? window.formatMoney(totalRev) : ('₹' + Number(totalRev || 0).toLocaleString());
    const count = document.querySelector('.sa-table-toolbar .sa-table-count');
    if (count && document.getElementById('sa-trips-container')) count.textContent = `Showing ${trips.length} of ${trips.length} trips`;
  },

  applyTripFilters() {
    const container = document.getElementById('trips-render-container') || document.getElementById('sa-trips-container');
    if (!container) return;
    const q = (document.getElementById('sa-trip-search')?.value || '').toLowerCase();
    const status = document.getElementById('sa-trip-status-filter')?.value || 'All Status';
    let shown = 0;
    container.querySelectorAll('.sa-trip-card').forEach((card) => {
      const textMatch = card.textContent.toLowerCase().includes(q);
      const statusMatch = status === 'All Status' || card.dataset.status === status;
      const visible = textMatch && statusMatch;
      card.style.display = visible ? '' : 'none';
      if (visible) shown += 1;
    });
    const count = document.querySelector('.sa-table-toolbar .sa-table-count');
    if (count && document.getElementById('sa-trips-container')) count.textContent = `Showing ${shown} of ${(this.currentTrips || []).length} trips`;
  },

  exportTripsCsv() {
    const trips = this.currentTrips || [];
    const lines = [
      ['ID', 'Title', 'Destination', 'Status', 'Traveler', 'Start Date', 'End Date', 'Budget', 'Progress'],
      ...trips.map((trip) => [trip.id, trip.title, trip.destination, tripDisplayStatus(trip), trip.travelerName, trip.startDate, trip.endDate, trip.budget || 0, trip.progress || 0]),
    ];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dream-destination-trips.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  async renderUsers() {
    const tbody = document.getElementById('users-render-body') || document.getElementById('sa-users-body');
    if (!tbody) return;
    try {
      const res = await ApiClient.get('/users');
      const users = Array.isArray(res) ? res : (res.data || []);
      tbody.innerHTML = '';
      this.currentUsers = users;
      this.renderUserStats(users);

      // Also sync to local workflow state if present
      try {
        const salStore = JSON.parse(localStorage.getItem('dd_user_salaries_v1') || '{}');
        users.forEach((u) => {
          if (u.id && salStore[u.id] !== undefined) u.monthlySalary = salStore[u.id];
          else if (u.email && salStore[u.email.toLowerCase()] !== undefined) u.monthlySalary = salStore[u.email.toLowerCase()];
        });
        const STORE_KEY = 'dream_destination_workflow_v5';
        const st = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (st && Array.isArray(st.users)) {
          st.users = users;
          localStorage.setItem(STORE_KEY, JSON.stringify(st));
        }
      } catch (_) {}

      if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px;">No users found.</td></tr>`;
        return;
      }

      let salStore = {};
      let asgStore = {};
      try {
        salStore = JSON.parse(localStorage.getItem('dd_user_salaries_v1') || '{}');
        asgStore = JSON.parse(localStorage.getItem('dd_traveler_assignments_v1') || '{}');
      } catch (_) {}

      users.forEach((user) => {
        const roleBadge = getRoleBadgeClass(user.role);
        const status = user.status || 'Active';
        const statusClass = status === 'Active' ? 'sa-status-active' : (status === 'Suspended' ? 'sa-status-suspended' : 'sa-status-inactive');
        const initials = getInitials(user.name);
        
        const userSal = (user.id && salStore[user.id] !== undefined)
          ? salStore[user.id]
          : ((user.email && salStore[user.email.toLowerCase()] !== undefined)
              ? salStore[user.email.toLowerCase()]
              : user.monthlySalary);

        let salaryDisplay = '-';
        if (['Super User', 'Super Admin'].includes(user.role)) {
          salaryDisplay = `<span style="font-weight:700;color:#7c3aed;background:#f3e8ff;padding:4px 10px;border-radius:12px;font-size:12px;border:1px solid #ddd6fe;display:inline-flex;align-items:center;gap:4px;">👑 Owner (Platform Profits)</span>`;
        } else if (['Travel Partner', 'Support Executive', 'Support'].includes(user.role) || (userSal !== undefined && userSal !== null && userSal !== '')) {
          const sal = (userSal !== undefined && userSal !== null && userSal !== '')
            ? Number(userSal)
            : (user.role === 'Travel Partner' ? 65000 : 45000);
          salaryDisplay = `
            <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
              <span style="font-weight:700; color:#059669; font-size:0.875rem;">₹${sal.toLocaleString()}/mo</span>
              <button onclick="window.disburseEmployeeSalary('${escapeJS(user.id)}', '${escapeJS(user.name)}', ${sal}, '${escapeJS(user.email || '')}', '${escapeJS(user.role || '')}')" style="padding:3px 10px; font-size:11px; background:linear-gradient(135deg, #10b981, #059669); color:#ffffff; border:none; border-radius:6px; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(16,185,129,0.25);" title="Disburse monthly salary">
                💸 Disburse Salary
              </button>
            </div>`;
        } else if (['Vendor', 'Tour Guide'].includes(user.role)) {
          salaryDisplay = `<span style="font-weight:600;color:#0369a1;background:#e0f2fe;padding:3px 8px;border-radius:12px;font-size:12px;">Per-Trip Share</span>`;
        }

        let assignmentHTML = '';
        if (user.role === 'Traveler') {
          let asg = asgStore[user.id] || (user.email ? asgStore[user.email.toLowerCase()] : null);
          if (!asg) {
            asg = autoAssignTraveler(user.id || user.email, users);
            asgStore[user.id || user.email] = asg;
          }
          const pName = asg ? asg.partnerName : 'Unassigned';
          const sName = asg ? asg.supportName : 'Unassigned';
          assignmentHTML = `
            <div style="font-size: 11px; margin-top: 4px; line-height: 1.35;">
              <div style="color: #0284c7; font-weight: 600;">Partner: ${escapeHTML(pName)}</div>
              <div style="color: #7c3aed; font-weight: 600;">Support: ${escapeHTML(sName)}</div>
            </div>`;
        }

        const trHTML = `
          <tr data-role="${escapeHTML(user.role)}" data-status="${escapeHTML(status)}">
            <td><div class="sa-user-cell"><div class="sa-user-avatar" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">${escapeHTML(initials)}</div><div><div class="sa-user-name">${escapeHTML(user.name)}</div><div class="sa-user-email">${escapeHTML(user.email)}</div></div></div></td>
            <td><span class="sa-role-badge ${roleBadge}">${escapeHTML(user.role)}</span>${assignmentHTML}</td>
            <td><span class="sa-status-badge ${statusClass}" style="${status === 'Suspended' ? 'background:#fee2e2;color:#991b1b;' : ''}"><span class="sa-status-dot"></span> ${escapeHTML(status)}</span></td>
            <td><div>${salaryDisplay}</div></td>
            <td><div class="sa-user-contact"><div>${escapeHTML(user.phone || '-')}</div></div></td>
            <td><div class="sa-contact-loc">${formatDate(user.joined)}</div></td>
            <td>
              <div class="sa-actions-cell">
                <button class="sa-btn-icon" title="Edit" onclick="window.location.href='superuser_edit_user.html?id=${encodeURIComponent(user.id)}'"><i data-icon="edit"></i></button>
                <button class="sa-btn-icon" title="Activate" onclick="CRUD.setUserStatus('${escapeJS(user.id)}', 'Active')"><i data-icon="checkcircle"></i></button>
                <button class="sa-btn-icon" title="Inactivate" onclick="CRUD.setUserStatus('${escapeJS(user.id)}', 'Inactive')"><i data-icon="clock"></i></button>
                <button class="sa-btn-icon" title="Suspend" onclick="CRUD.setUserStatus('${escapeJS(user.id)}', 'Suspend')"><i data-icon="ban"></i></button>
                <button class="sa-btn-icon sa-btn-icon-danger" title="Delete" onclick="CRUD.deleteRecord('users', '${escapeJS(user.id)}', '${escapeJS(user.name)}')"><i data-icon="trash"></i></button>
              </div>
            </td>
          </tr>`;
        tbody.insertAdjacentHTML('beforeend', trHTML);
      });

      this.initIconsInContainer(tbody);
      this.applyUserFilters();
    } catch (err) {
      console.warn('API get users failed; attempting local fallback:', err.message);
      try {
        const STORE_KEY = 'dream_destination_workflow_v5';
        const st = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (st && Array.isArray(st.users) && st.users.length) {
          const users = st.users;
          tbody.innerHTML = '';
          this.currentUsers = users;
          this.renderUserStats(users);
          users.forEach((user) => {
            const roleBadge = getRoleBadgeClass(user.role);
            const status = user.status || 'Active';
            const statusClass = status === 'Active' ? 'sa-status-active' : (status === 'Suspended' ? 'sa-status-suspended' : 'sa-status-inactive');
            const initials = getInitials(user.name);
            const trHTML = `
              <tr data-role="${escapeHTML(user.role)}" data-status="${escapeHTML(status)}">
                <td><div class="sa-user-cell"><div class="sa-user-avatar" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">${escapeHTML(initials)}</div><div><div class="sa-user-name">${escapeHTML(user.name)}</div><div class="sa-user-email">${escapeHTML(user.email)}</div></div></div></td>
                <td><span class="sa-role-badge ${roleBadge}">${escapeHTML(user.role)}</span></td>
                <td><span class="sa-status-badge ${statusClass}" style="${status === 'Suspended' ? 'background:#fee2e2;color:#991b1b;' : ''}"><span class="sa-status-dot"></span> ${escapeHTML(status)}</span></td>
                <td><div class="sa-user-contact"><div>${escapeHTML(user.phone || '-')}</div></div></td>
                <td><div class="sa-contact-loc">${formatDate(user.joined)}</div></td>
                <td>
                  <div class="sa-actions-cell">
                    <button class="sa-btn-icon" title="Edit" onclick="window.location.href='superuser_edit_user.html?id=${encodeURIComponent(user.id)}'"><i data-icon="edit"></i></button>
                    <button class="sa-btn-icon" title="Activate" onclick="CRUD.setUserStatus('${escapeJS(user.id)}', 'Active')"><i data-icon="checkcircle"></i></button>
                    <button class="sa-btn-icon" title="Inactivate" onclick="CRUD.setUserStatus('${escapeJS(user.id)}', 'Inactive')"><i data-icon="clock"></i></button>
                    <button class="sa-btn-icon" title="Suspend" onclick="CRUD.setUserStatus('${escapeJS(user.id)}', 'Suspended')"><i data-icon="ban"></i></button>
                    <button class="sa-btn-icon sa-btn-icon-danger" title="Delete" onclick="CRUD.deleteRecord('users', '${escapeJS(user.id)}', '${escapeJS(user.name)}')"><i data-icon="trash"></i></button>
                  </div>
                </td>
              </tr>`;
            tbody.insertAdjacentHTML('beforeend', trHTML);
          });
          this.initIconsInContainer(tbody);
          this.applyUserFilters();
          return;
        }
      } catch (_) {}
      const count = document.getElementById('user-count-display');
      if (count) count.textContent = 'Error connecting to database';
    }
  },

  renderUserStats(users) {
    const cards = document.querySelectorAll('.sa-stats-grid-4 .sa-sw-count');
    if (cards[0]) cards[0].textContent = users.length;
    if (cards[1]) cards[1].textContent = users.filter((user) => (user.status || 'Active') === 'Active').length;
    if (cards[2]) cards[2].textContent = users.filter((user) => user.status === 'Inactive').length;
    if (cards[3]) cards[3].textContent = users.filter((user) => user.status === 'Suspended').length;
    const count = document.getElementById('user-count-display');
    if (count) count.textContent = `Showing ${users.length} of ${users.length} users`;
  },

  applyUserFilters() {
    const tbody = document.getElementById('users-render-body') || document.getElementById('sa-users-body');
    if (!tbody) return;
    const q = (document.getElementById('sa-user-search')?.value || '').toLowerCase();
    const role = document.getElementById('sa-role-filter')?.value || 'All Roles';
    const status = document.getElementById('sa-status-filter')?.value || 'All Status';
    let shown = 0;
    tbody.querySelectorAll('tr').forEach((row) => {
      const textMatch = row.textContent.toLowerCase().includes(q);
      const roleMatch = role === 'All Roles' || row.dataset.role === role;
      const statusMatch = status === 'All Status' || row.dataset.status === status;
      const visible = textMatch && roleMatch && statusMatch;
      row.style.display = visible ? '' : 'none';
      if (visible) shown += 1;
    });
    const count = document.getElementById('user-count-display');
    if (count) count.textContent = `Showing ${shown} of ${(this.currentUsers || []).length} users`;
  },

  async setUserStatus(id, status) {
    if (!canCrudOperate()) return;
    try {
      await ApiClient.patch(`/users/${id}`, { status });
      if (typeof Toast !== 'undefined') Toast.success(`User marked ${status}.`);
      else alert(`User marked ${status}.`);

      // Also update in local workflow state if present
      try {
        const STORE_KEY = 'dream_destination_workflow_v5';
        const st = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (st && Array.isArray(st.users)) {
          const u = st.users.find((x) => x.id === id);
          if (u) {
            u.status = status;
            localStorage.setItem(STORE_KEY, JSON.stringify(st));
          }
        }
      } catch (_) {}

      await this.renderUsers();
    } catch (err) {
      if (typeof Toast !== 'undefined') Toast.error(err.message);
      else alert(err.message);
    }
  },

  exportUsersCsv() {
    const users = this.currentUsers || [];
    const lines = [
      ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'],
      ...users.map((user) => [user.id, user.name, user.email, user.phone || '', user.role, user.status || 'Active', user.joined]),
    ];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dream-destination-users.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  initIconsInContainer(container) {
    if (typeof Icons === 'undefined') return;
    container.querySelectorAll('[data-icon]').forEach((el) => {
      const iconName = el.getAttribute('data-icon');
      if (Icons[iconName]) el.innerHTML = Icons[iconName];
    });
  },
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeJS(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function canCrudOperate() {
  try {
    const session = JSON.parse(sessionStorage.getItem('dd_session') || localStorage.getItem('dd_session') || '{}');
    const rawRole = String(session.role || session.displayRole || '').toLowerCase().trim();
    // Superuser always allowed
    if (rawRole === 'superuser' || rawRole === 'super user' || rawRole === 'super_admin' || rawRole === 'super admin') return true;
    if (session.email && session.status === 'Suspended') {
      if (typeof Toast !== 'undefined') Toast.error('Your account is suspended. You cannot perform any actions.');
      else alert('Your account is suspended. Contact the Super Admin.');
      return false;
    }
    if (session.email && session.status === 'Inactive') {
      if (typeof Toast !== 'undefined') Toast.warning('Your account is inactive. You can view data but cannot make changes until the Super Admin reactivates your account.');
      else alert('Your account is inactive. Operations are blocked.');
      return false;
    }
  } catch {
    return true;
  }
  return true;
}

function tripDisplayStatus(trip) {
  if (trip.status === 'completed') return 'Completed';
  if (trip.status === 'ongoing') return 'Ongoing';
  if (trip.status === 'requested') return 'Requested';
  if (trip.status === 'planning') return 'Upcoming';
  if (trip.status === 'cancelled') return 'Cancelled';
  return trip.status || 'Planned';
}

function getRoleBadgeClass(role) {
  if (!role) return 'sa-role-user';
  const r = role.toLowerCase();
  if (r.includes('super')) return 'sa-role-admin';
  if (r.includes('partner')) return 'sa-role-partner';
  if (r.includes('vendor')) return 'sa-role-vendor';
  if (r.includes('guide')) return 'sa-role-guide';
  return 'sa-role-user';
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('trips-render-container') || document.getElementById('sa-trips-container')) {
    CRUD.renderTrips();
    setInterval(() => {
      if (!document.hidden && !document.getElementById('prototype-confirm-modal')) {
        CRUD.renderTrips();
      }
    }, 300000);
  }
  if (document.getElementById('users-render-body') || document.getElementById('sa-users-body')) {
    CRUD.renderUsers();
    setInterval(() => {
      if (!document.hidden && !document.getElementById('prototype-confirm-modal')) {
        CRUD.renderUsers();
      }
    }, 300000);
  }
  document.getElementById('sa-user-search')?.addEventListener('input', () => CRUD.applyUserFilters());
  document.getElementById('sa-role-filter')?.addEventListener('change', () => CRUD.applyUserFilters());
  document.getElementById('sa-status-filter')?.addEventListener('change', () => CRUD.applyUserFilters());
  document.getElementById('sa-trip-search')?.addEventListener('input', () => CRUD.applyTripFilters());
  document.getElementById('sa-trip-status-filter')?.addEventListener('change', () => CRUD.applyTripFilters());
  document.querySelectorAll('.sa-table-toolbar .sa-btn-outline-sm').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      if (document.getElementById('sa-vendors-container')) {
        event.preventDefault();
        if (typeof window.exportVendorsCsv === 'function') window.exportVendorsCsv();
      } else if (document.getElementById('sa-guides-container')) {
        event.preventDefault();
        if (typeof window.exportGuidesCsv === 'function') window.exportGuidesCsv();
      } else if (document.getElementById('sa-users-body')) {
        event.preventDefault();
        CRUD.exportUsersCsv();
      } else if (document.getElementById('sa-trips-container')) {
        event.preventDefault();
        CRUD.exportTripsCsv();
      }
    });
  });

  const userForm = document.getElementById('crud-user-form') || document.getElementById('crud-user-edit-form');
  if (userForm) {
    if (userForm.id === 'crud-user-edit-form') CRUD.loadRecordForEdit('users');
    userForm.addEventListener('submit', (e) => {
      if (!canCrudOperate()) {
        e.preventDefault();
        return;
      }
      CRUD.handleFormSubmit(e, 'users', 'superuser_users.html');
    });
  }

  const tripForm = document.getElementById('crud-trip-form') || document.getElementById('crud-trip-edit-form');
  if (tripForm) {
    if (tripForm.id === 'crud-trip-edit-form') CRUD.loadRecordForEdit('trips');
    tripForm.addEventListener('submit', (e) => CRUD.handleFormSubmit(e, 'trips', 'superuser_trips.html'));
  }
});

window.disburseEmployeeSalary = function(userId, userName, amount, userEmail, role) {
    const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!confirm(`Confirm Salary Dispersal?\n\nDisburse ₹${Number(amount).toLocaleString()} monthly salary to ${userName} for ${month}?`)) {
        return;
    }

    try {
        const salLogs = JSON.parse(localStorage.getItem('dd_salary_payouts_v1') || '[]');
        const payId = 'PAY-' + Date.now().toString().slice(-4);
        salLogs.unshift({
            id: payId,
            userId: userId || userEmail,
            userName: userName,
            userEmail: userEmail || '',
            role: role || '',
            amount: amount,
            month: month,
            disbursedAt: new Date().toISOString(),
            status: 'Completed'
        });
        localStorage.setItem('dd_salary_payouts_v1', JSON.stringify(salLogs));

        // Standardized notification payload for workflow state and employee dashboards
        const notifObj = {
            id: 'NOTIF-' + Date.now().toString().slice(-4),
            roles: ['partner', 'support', 'guide', 'vendor', 'all', 'superuser'],
            tripId: '',
            tripTitle: 'Monthly Salary',
            title: 'Monthly Salary Disbursed',
            message: `Your monthly salary of ₹${Number(amount).toLocaleString()} for ${month} has been successfully processed by Super Admin.`,
            type: 'Success',
            readBy: [],
            recipientId: userId || userEmail || '',
            userEmail: userEmail || '',
            userName: userName || '',
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            read: false
        };

        // Sync notification across all state stores
        ['dd_workflow_state_v3', 'dream_destination_workflow_v5'].forEach(stKey => {
            try {
                const st = JSON.parse(localStorage.getItem(stKey) || '{}');
                if (st) {
                    if (!Array.isArray(st.notifications)) st.notifications = [];
                    st.notifications.unshift(notifObj);
                    localStorage.setItem(stKey, JSON.stringify(st));
                }
            } catch (_) {}
        });

        if (typeof ApiClient !== 'undefined' && typeof ApiClient.post === 'function') {
            ApiClient.post('/notifications', notifObj).catch(() => {});
        }
    } catch (_) {}

    if (typeof Toast !== 'undefined') {
        Toast.success(`₹${Number(amount).toLocaleString()} salary disbursed to ${userName} successfully!`);
    } else {
        alert(`₹${Number(amount).toLocaleString()} salary disbursed to ${userName} successfully!`);
    }
};

window.runBulkEmployeePayroll = async function() {
    let users = (CRUD.currentUsers && CRUD.currentUsers.length) ? CRUD.currentUsers : [];
    if (!users.length) {
        try {
            const res = await ApiClient.get('/users');
            users = Array.isArray(res) ? res : (res.data || []);
            if (users.length) CRUD.currentUsers = users;
        } catch (_) {}
    }
    if (!users.length) {
        try {
            const st = JSON.parse(localStorage.getItem('dream_destination_workflow_v5') || '{}');
            if (st && Array.isArray(st.users)) users = st.users;
        } catch (_) {}
    }

    let salStore = {};
    try {
        salStore = JSON.parse(localStorage.getItem('dd_user_salaries_v1') || '{}');
    } catch (_) {}

    const salariedRoles = ['Travel Partner', 'Support Executive', 'Support'];
    const eligibleEmployees = users.filter(u => {
        if (u.role === 'Super User' || u.role === 'Super Admin') return false;
        const isSalariedRole = salariedRoles.includes(u.role);
        const hasCustomSal = (u.id && salStore[u.id] > 0) || (u.email && salStore[u.email.toLowerCase()] > 0) || (u.monthlySalary > 0);
        const isActive = (u.status || 'Active') === 'Active';
        return isActive && (isSalariedRole || hasCustomSal);
    });

    if (!eligibleEmployees.length) {
        if (typeof Toast !== 'undefined') Toast.info('No active salaried employees found for payroll execution.');
        else alert('No active salaried employees found for payroll execution.');
        return;
    }

    let totalPayrollAmount = 0;
    const payrollDetails = eligibleEmployees.map(emp => {
        let sal = (emp.id && salStore[emp.id] !== undefined)
            ? salStore[emp.id]
            : ((emp.email && salStore[emp.email.toLowerCase()] !== undefined)
                ? salStore[emp.email.toLowerCase()]
                : emp.monthlySalary);

        if (sal === undefined || sal === null || sal === '') {
            sal = (emp.role === 'Travel Partner' ? 65000 : emp.role === 'Support Executive' ? 45000 : 80000);
        }
        sal = Number(sal) || 0;
        totalPayrollAmount += sal;
        return { emp, sal };
    });

    const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const confirmMsg = `⚡ RUN AUTOMATED BULK PAYROLL\n\n` +
        `Disburse monthly salaries for ${month}?\n\n` +
        `• Total Salaried Employees: ${eligibleEmployees.length} staff members\n` +
        `• Total Payroll Outflow: ₹${totalPayrollAmount.toLocaleString()}\n\n` +
        `Click OK to execute automated bank transfers and log payment receipts for all employees.`;

    if (!confirm(confirmMsg)) return;

    try {
        const salLogs = JSON.parse(localStorage.getItem('dd_salary_payouts_v1') || '[]');
        const newNotifs = [];

        payrollDetails.forEach(({ emp, sal }) => {
            const payId = 'PAY-' + Math.floor(1000 + Math.random() * 9000);
            const empId = emp.id || emp.email;
            salLogs.unshift({
                id: payId,
                userId: empId,
                userName: emp.name,
                userEmail: emp.email,
                role: emp.role,
                amount: sal,
                month: month,
                disbursedAt: new Date().toISOString(),
                status: 'Completed'
            });

            const notifObj = {
                id: 'NOTIF-' + Date.now().toString().slice(-4) + Math.floor(Math.random() * 100),
                roles: ['partner', 'support', 'guide', 'vendor', 'all', 'superuser'],
                tripId: '',
                tripTitle: 'Monthly Salary',
                title: 'Monthly Salary Disbursed',
                message: `Your monthly salary of ₹${Number(sal).toLocaleString()} for ${month} has been successfully processed by Super Admin.`,
                type: 'Success',
                readBy: [],
                recipientId: empId,
                userEmail: emp.email || '',
                userName: emp.name || '',
                createdAt: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                read: false
            };
            newNotifs.push(notifObj);
        });

        localStorage.setItem('dd_salary_payouts_v1', JSON.stringify(salLogs));

        ['dd_workflow_state_v3', 'dream_destination_workflow_v5'].forEach(stKey => {
            try {
                const st = JSON.parse(localStorage.getItem(stKey) || '{}');
                if (st) {
                    if (!Array.isArray(st.notifications)) st.notifications = [];
                    newNotifs.forEach(n => st.notifications.unshift(n));
                    localStorage.setItem(stKey, JSON.stringify(st));
                }
            } catch (_) {}
        });

        if (typeof ApiClient !== 'undefined' && typeof ApiClient.post === 'function') {
            newNotifs.forEach(n => ApiClient.post('/notifications', n).catch(() => {}));
        }
    } catch (_) {}

    const successMsg = `⚡ Bulk Payroll Executed Successfully!\n\n` +
        `Disbursed ₹${totalPayrollAmount.toLocaleString()} to ${eligibleEmployees.length} employees for ${month}.`;

    if (typeof Toast !== 'undefined') Toast.success(successMsg);
    else alert(successMsg);
};
