<template>
  <div v-if="!content.portalTarget || content.portalTarget === 'member'" class="mfav" :class="{ 'mfav--loading-initial': initialLoad }">

    <!-- Non-member gate -->
    <div v-if="!content.isMember" class="mfav__locked">
      <svg class="mfav__locked-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <p class="mfav__locked-title">Members only</p>
      <p class="mfav__locked-sub">Subscribe to save your favourite products.</p>
    </div>

    <template v-else>
      <!-- ── Tabs ── -->
      <div class="mfav__tabs" role="tablist">
        <button
          class="mfav__tab"
          :class="{ 'mfav__tab--active': activeTab === 'mine' }"
          role="tab"
          :aria-selected="activeTab === 'mine'"
          @click="switchTab('mine')"
        >
          My Favourites
          <span v-if="myFavs.length" class="mfav__tab-count">{{ myFavs.length }}</span>
        </button>
        <button
          v-if="content.householdId"
          class="mfav__tab"
          :class="{ 'mfav__tab--active': activeTab === 'household' }"
          role="tab"
          :aria-selected="activeTab === 'household'"
          @click="switchTab('household')"
        >
          Household
          <span v-if="householdFavs.length" class="mfav__tab-count">{{ householdFavs.length }}</span>
        </button>
      </div>

      <!-- ── Recently added strip (my tab only) ── -->
      <div
        v-if="activeTab === 'mine' && recentFavs.length > 0"
        class="mfav__recent"
      >
        <p class="mfav__recent-label">Recently added</p>
        <div class="mfav__recent-scroll">
          <button
            v-for="item in recentFavs"
            :key="item.favorite_id"
            class="mfav__recent-chip"
            @click="scrollToProduct(item.product_id)"
            :title="item.product_name"
          >
            <img
              v-if="item.image_url"
              :src="item.image_url"
              class="mfav__recent-chip-img"
              :alt="item.product_name"
            />
            <span class="mfav__recent-chip-name">{{ item.product_name }}</span>
          </button>
        </div>
      </div>

      <!-- ── Loading skeletons ── -->
      <div v-if="loading" class="mfav__grid" aria-busy="true">
        <div v-for="n in 4" :key="n" class="mfav__card mfav__card--skeleton">
          <div class="mfav__skeleton-img"></div>
          <div class="mfav__skeleton-line mfav__skeleton-line--wide"></div>
          <div class="mfav__skeleton-line mfav__skeleton-line--narrow"></div>
        </div>
      </div>

      <!-- ── Error state ── -->
      <div v-else-if="loadError" class="mfav__empty">
        <svg class="mfav__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p class="mfav__empty-title">Couldn't load favourites</p>
        <button class="mfav__retry-btn" @click="fetchFavs">Try again</button>
      </div>

      <!-- ── Empty state ── -->
      <div v-else-if="currentList.length === 0" class="mfav__empty">
        <svg class="mfav__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <p class="mfav__empty-title">No favourites yet</p>
        <p class="mfav__empty-sub">
          {{ activeTab === 'mine' ? 'Heart products to save them here.' : 'No household members have saved favourites yet.' }}
        </p>
      </div>

      <!-- ── Product grid ── -->
      <ul v-else class="mfav__grid" role="list">
        <li
          v-for="item in currentList"
          :key="activeTab === 'mine' ? item.favorite_id : item.product_id"
          :id="`fav-${item.product_id}`"
          class="mfav__card"
        >
          <!-- Product image -->
          <div class="mfav__card-img-wrap">
            <img
              v-if="item.image_url"
              :src="item.image_url"
              class="mfav__card-img"
              :alt="item.product_name"
              loading="lazy"
            />
            <div v-else class="mfav__card-img-placeholder" aria-hidden="true"></div>

            <!-- Category badge -->
            <span v-if="item.category_name" class="mfav__card-cat">{{ item.category_name }}</span>

            <!-- Household initials (household tab) -->
            <div v-if="activeTab === 'household' && item.favorited_by_initials?.length" class="mfav__card-initials">
              <span
                v-for="(ini, idx) in item.favorited_by_initials.slice(0, 3)"
                :key="idx"
                class="mfav__card-initial"
                :title="`${item.favorited_by_count} household member${item.favorited_by_count !== 1 ? 's' : ''} saved this`"
              >{{ ini }}</span>
              <span v-if="item.favorited_by_count > 3" class="mfav__card-initial mfav__card-initial--more">+{{ item.favorited_by_count - 3 }}</span>
            </div>
          </div>

          <!-- Card body -->
          <div class="mfav__card-body">
            <p class="mfav__card-name">{{ item.product_name }}</p>
            <p v-if="item.price_cents" class="mfav__card-price">
              {{ formatPrice(item.price_cents, item.currency) }}
            </p>

            <!-- Recent badge (household tab) -->
            <span v-if="activeTab === 'household' && item.is_recent" class="mfav__card-new-badge">New</span>
          </div>

          <!-- Card actions -->
          <div class="mfav__card-actions">
            <!-- Heart / unfavourite (my tab always; household tab for own favs) -->
            <button
              v-if="activeTab === 'mine' || item.is_favorited_by_me"
              class="mfav__heart-btn"
              :class="{ 'mfav__heart-btn--active': activeTab === 'mine' || item.is_favorited_by_me }"
              :disabled="togglingIds.has(item.product_id)"
              :title="activeTab === 'mine' || item.is_favorited_by_me ? 'Remove from favourites' : 'Save to favourites'"
              @click="handleToggle(item)"
            >
              <svg class="mfav__heart-icon" viewBox="0 0 24 24" :fill="(activeTab === 'mine' || item.is_favorited_by_me) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>

            <!-- Add to cart -->
            <button
              v-if="item.is_active !== false"
              class="mfav__cart-btn"
              :disabled="addingToCart.has(item.product_id)"
              :title="`Add ${item.product_name} to cart`"
              @click="handleAddToCart(item)"
            >
              <svg v-if="!addingToCart.has(item.product_id)" class="mfav__cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <svg v-else class="mfav__cart-icon mfav__cart-icon--spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script>
// ── Inline Supabase client ──
function createSpreadClient({ supabaseUrl, supabaseAnonKey, accessToken }) {
  const headers = { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return {
    async rpc(fn, params = {}) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers, body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(`RPC ${fn}: ${err.message || res.status}`);
      }
      return res.json();
    },
  };
}

// ── Inline Realtime subscription (Phoenix Protocol WebSocket) ──
function createRealtimeSubscription({ supabaseUrl, supabaseAnonKey, accessToken, channelName, table, filter, onchange }) {
  const wsUrl = supabaseUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    + `/realtime/v1/websocket?vsn=1.0.0&apikey=${encodeURIComponent(supabaseAnonKey)}`;

  let ws = null;
  let heartbeatTimer = null;
  let ref = 0;
  let closed = false;

  function nextRef() { return ++ref; }
  function send(msg) {
    try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); } catch (_) {}
  }

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (closed) { ws.close(); return; }
    send({
      topic: `realtime:${channelName}`,
      event: 'phx_join',
      payload: {
        config: { postgres_changes: [{ event: '*', schema: 'public', table, filter: filter || undefined }] },
        access_token: accessToken,
      },
      ref: String(nextRef()),
    });
    heartbeatTimer = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(nextRef()) }), 25000);
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event === 'postgres_changes' && msg.payload) onchange(msg.payload.data || msg.payload);
    } catch (_) {}
  };

  ws.onerror = () => {};
  ws.onclose = () => { if (heartbeatTimer) clearInterval(heartbeatTimer); };

  return {
    close() {
      closed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      try { if (ws) ws.close(); } catch (_) {}
    },
  };
}

// Format price from cents → $X.XX
function formatPrice(cents, currency = 'aud') {
  if (!cents && cents !== 0) return '';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase() || 'AUD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default {
  props: {
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    content: { type: Object, required: true },
    wwFrontState: { type: Object, required: true },
    wwElementState: { type: Object, required: true },
  },

  emits: ['trigger-event', 'update:content'],

  data() {
    return {
      activeTab: 'mine',
      myFavs: [],
      householdFavs: [],
      loading: false,
      initialLoad: true,
      loadError: false,
      togglingIds: new Set(),
      addingToCart: new Set(),
      _realtimeSub: null,
    };
  },

  computed: {
    currentList() {
      return this.activeTab === 'mine' ? this.myFavs : this.householdFavs;
    },
    recentFavs() {
      const cutoff = Date.now() - SEVEN_DAYS_MS;
      return this.myFavs.filter(f => new Date(f.created_at).getTime() >= cutoff).slice(0, 5);
    },
  },

  watch: {
    'content.accessToken'(newToken, oldToken) {
      if (newToken && newToken !== oldToken && this.content.isMember) {
        this.fetchFavs();
        this.setupRealtime();
      }
    },
    'content.isMember'(isMember) {
      if (isMember && this.content.accessToken) {
        this.fetchFavs();
        this.setupRealtime();
      } else {
        this.teardownRealtime();
        this.myFavs = [];
        this.householdFavs = [];
      }
    },
    activeTab(tab) {
      if (tab === 'household' && this.householdFavs.length === 0 && !this.loading) {
        this.fetchHouseholdFavs();
      }
    },
  },

  async mounted() {
    if (this.content.isMember && this.content.accessToken) {
      await this.fetchFavs();
      this.setupRealtime();
    }
    this.initialLoad = false;
  },

  beforeUnmount() {
    this.teardownRealtime();
  },

  methods: {
    formatPrice,

    async fetchFavs() {
      this.loading = true;
      this.loadError = false;
      try {
        await this.fetchMyFavs();
        if (this.activeTab === 'household' && this.content.householdId) {
          await this.fetchHouseholdFavs();
        }
      } finally {
        this.loading = false;
      }
    },

    async fetchMyFavs() {
      const { supabaseUrl, supabaseAnonKey, accessToken } = this.content;
      if (!supabaseUrl || !supabaseAnonKey || !accessToken) return;
      try {
        const client = createSpreadClient({ supabaseUrl, supabaseAnonKey, accessToken });
        const res = await client.rpc('get_my_favorites');
        this.myFavs = res?.favorites || [];
        this.loadError = false;
      } catch (err) {
        console.warn('[member-favorites] fetchMyFavs:', err.message);
        this.loadError = true;
      }
    },

    async fetchHouseholdFavs() {
      const { supabaseUrl, supabaseAnonKey, accessToken, householdId } = this.content;
      if (!supabaseUrl || !supabaseAnonKey || !accessToken || !householdId) return;
      try {
        const client = createSpreadClient({ supabaseUrl, supabaseAnonKey, accessToken });
        const res = await client.rpc('get_household_favorites', { p_household_id: householdId });
        this.householdFavs = res?.favorites || [];
        this.loadError = false;
      } catch (err) {
        console.warn('[member-favorites] fetchHouseholdFavs:', err.message);
        this.loadError = true;
      }
    },

    async handleToggle(item) {
      const { supabaseUrl, supabaseAnonKey, accessToken } = this.content;
      if (!supabaseUrl || !supabaseAnonKey || !accessToken) return;

      const productId = item.product_id;
      if (this.togglingIds.has(productId)) return;
      this.togglingIds = new Set([...this.togglingIds, productId]);

      try {
        const client = createSpreadClient({ supabaseUrl, supabaseAnonKey, accessToken });
        const result = await client.rpc('toggle_favorite', { p_product_id: productId });

        // Optimistic sync — Realtime will confirm
        if (result.favorited === false && this.activeTab === 'mine') {
          this.myFavs = this.myFavs.filter(f => f.product_id !== productId);
        }

        this.$emit('trigger-event', {
          name: result.favorited ? 'favorites:added' : 'favorites:removed',
          event: { productId, productName: item.product_name },
        });
      } catch (err) {
        console.warn('[member-favorites] toggle_favorite:', err.message);
        this.$emit('trigger-event', {
          name: 'favorites:error',
          event: { productId, message: err.message },
        });
      } finally {
        const next = new Set(this.togglingIds);
        next.delete(productId);
        this.togglingIds = next;
      }
    },

    async handleAddToCart(item) {
      const { supabaseUrl, supabaseAnonKey, accessToken } = this.content;
      if (!supabaseUrl || !supabaseAnonKey || !accessToken) return;

      const productId = item.product_id;
      if (this.addingToCart.has(productId)) return;
      this.addingToCart = new Set([...this.addingToCart, productId]);

      try {
        const client = createSpreadClient({ supabaseUrl, supabaseAnonKey, accessToken });
        await client.rpc('add_to_cart', { p_product_id: productId, p_qty: 1 });
        this.$emit('trigger-event', {
          name: 'cart:item-added',
          event: { productId, productName: item.product_name },
        });
      } catch (err) {
        console.warn('[member-favorites] add_to_cart:', err.message);
        this.$emit('trigger-event', {
          name: 'cart:add-error',
          event: { productId, message: err.message },
        });
      } finally {
        const next = new Set(this.addingToCart);
        next.delete(productId);
        this.addingToCart = next;
      }
    },

    setupRealtime() {
      this.teardownRealtime();
      const { supabaseUrl, supabaseAnonKey, accessToken, householdId } = this.content;
      if (!supabaseUrl || !supabaseAnonKey || !accessToken || !householdId) return;

      this._realtimeSub = createRealtimeSubscription({
        supabaseUrl,
        supabaseAnonKey,
        accessToken,
        channelName: `user-favorites-${householdId}`,
        table: 'user_favorites',
        filter: `household_id=eq.${householdId}`,
        onchange: () => {
          // Refresh on any favourite change in the household
          this.fetchFavs();
        },
      });
    },

    teardownRealtime() {
      if (this._realtimeSub) {
        this._realtimeSub.close();
        this._realtimeSub = null;
      }
    },

    switchTab(tab) {
      this.activeTab = tab;
    },

    scrollToProduct(productId) {
      try {
        const doc = wwLib.getFrontDocument();
        const el = doc?.getElementById(`fav-${productId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {}
    },
  },
};
</script>

<style scoped>
/* ── Design tokens ── */
.mfav {
  --spread-primary: #4b162d;
  --spread-accent: #ce6632;
  --spread-accent-hover: #b85a2b;
  --spread-gold: #bead38;
  --spread-beige: #e6d8ca;
  --spread-surface: #ffffff;
  --spread-border: #f3eadf;
  --spread-bg: #fbfaf8;
  --spread-text-primary: #141414;
  --spread-text-secondary: #2b2b2b;
  --spread-text-muted: #6b7280;
  --spread-error: #d14343;
  --spread-radius-sm: 8px;
  --spread-radius-md: 12px;
  --spread-radius-lg: 16px;
  --spread-shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06);
  --spread-shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.1);
  --spread-font: 'Work Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;

  font-family: var(--spread-font);
  width: 100%;
  box-sizing: border-box;
  max-width: 1440px;
  margin-inline: auto;
}

/* ── Locked gate ── */
.mfav__locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  gap: 8px;
}

.mfav__locked-icon {
  width: 40px;
  height: 40px;
  color: var(--spread-text-muted);
  stroke-width: 1.5;
  margin-bottom: 4px;
}

.mfav__locked-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--spread-text-primary);
  margin: 0;
}

.mfav__locked-sub {
  font-size: 14px;
  color: var(--spread-text-muted);
  margin: 0;
}

/* ── Tabs ── */
.mfav__tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--spread-border);
  margin-bottom: 20px;
}

.mfav__tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-family: var(--spread-font);
  font-size: 14px;
  font-weight: 500;
  color: var(--spread-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.mfav__tab:hover {
  color: var(--spread-primary);
}

.mfav__tab--active {
  color: var(--spread-primary);
  font-weight: 700;
  border-bottom-color: var(--spread-accent);
}

.mfav__tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--spread-border);
  color: var(--spread-text-secondary);
  font-size: 11px;
  font-weight: 700;
  box-sizing: border-box;
}

.mfav__tab--active .mfav__tab-count {
  background: rgba(206, 102, 50, 0.15);
  color: var(--spread-accent);
}

/* ── Recently added strip ── */
.mfav__recent {
  margin-bottom: 20px;
}

.mfav__recent-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--spread-text-muted);
  margin: 0 0 8px;
}

.mfav__recent-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.mfav__recent-scroll::-webkit-scrollbar {
  display: none;
}

.mfav__recent-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--spread-border);
  border-radius: 999px;
  background: var(--spread-surface);
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--spread-font);
  font-size: 12px;
  font-weight: 500;
  color: var(--spread-text-secondary);
  transition: background 0.12s ease, border-color 0.12s ease;
  flex-shrink: 0;
}

.mfav__recent-chip:hover {
  background: var(--spread-bg);
  border-color: var(--spread-accent);
  color: var(--spread-primary);
}

.mfav__recent-chip-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--spread-border);
}

/* ── Product grid ── */
.mfav__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

/* ── Product card ── */
.mfav__card {
  background: var(--spread-surface);
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-md);
  box-shadow: var(--spread-shadow-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.mfav__card:hover {
  box-shadow: var(--spread-shadow-hover);
  transform: translateY(-2px);
}

/* ── Card image ── */
.mfav__card-img-wrap {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--spread-bg);
}

.mfav__card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}

.mfav__card:hover .mfav__card-img {
  transform: scale(1.04);
}

.mfav__card-img-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f3eadf 0%, #e6d8ca 100%);
}

.mfav__card-cat {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(75, 22, 45, 0.75);
  color: var(--spread-beige);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(4px);
}

/* ── Household member initials ── */
.mfav__card-initials {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: -4px;
}

.mfav__card-initial {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--spread-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--spread-surface);
  margin-left: -4px;
}

.mfav__card-initial:first-child { margin-left: 0; }

.mfav__card-initial--more {
  background: var(--spread-text-muted);
  font-size: 9px;
}

/* ── Card body ── */
.mfav__card-body {
  padding: 10px 12px 6px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mfav__card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--spread-text-primary);
  margin: 0;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mfav__card-price {
  font-size: 14px;
  font-weight: 700;
  color: var(--spread-accent);
  margin: 0;
}

.mfav__card-new-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(190, 173, 56, 0.18);
  color: #7a7010;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  align-self: flex-start;
  margin-top: 2px;
}

/* ── Card actions ── */
.mfav__card-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px 10px;
  align-items: center;
}

.mfav__heart-btn,
.mfav__cart-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.mfav__heart-btn {
  color: var(--spread-text-muted);
}

.mfav__heart-btn--active {
  color: #e03a4c;
  border-color: rgba(224, 58, 76, 0.3);
  background: rgba(224, 58, 76, 0.05);
}

.mfav__heart-btn:hover {
  color: #e03a4c;
  border-color: rgba(224, 58, 76, 0.4);
}

.mfav__heart-icon {
  width: 16px;
  height: 16px;
}

.mfav__cart-btn {
  flex: 1;
  color: var(--spread-surface);
  background: var(--spread-accent);
  border-color: var(--spread-accent);
  font-family: var(--spread-font);
  font-size: 12px;
  font-weight: 600;
  gap: 5px;
  width: auto;
  padding: 0 10px;
}

.mfav__cart-btn:hover:not(:disabled) {
  background: var(--spread-accent-hover);
  border-color: var(--spread-accent-hover);
}

.mfav__cart-btn:disabled,
.mfav__heart-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mfav__cart-icon {
  width: 15px;
  height: 15px;
}

.mfav__cart-icon--spinning {
  animation: mfav-spin 1s linear infinite;
}

@keyframes mfav-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Empty state ── */
.mfav__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  gap: 8px;
}

.mfav__empty-icon {
  width: 40px;
  height: 40px;
  color: var(--spread-text-muted);
  margin-bottom: 4px;
}

.mfav__empty-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--spread-text-primary);
  margin: 0;
}

.mfav__empty-sub {
  font-size: 14px;
  color: var(--spread-text-muted);
  margin: 0;
}

.mfav__retry-btn {
  padding: 8px 20px;
  border: 1px solid var(--spread-accent);
  border-radius: var(--spread-radius-sm);
  background: transparent;
  color: var(--spread-accent);
  font-family: var(--spread-font);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-top: 4px;
}

.mfav__retry-btn:hover {
  background: var(--spread-accent);
  color: #fff;
}

/* ── Skeleton loader ── */
.mfav__card--skeleton {
  pointer-events: none;
  animation: mfav-skeleton-fade 1.4s ease-in-out infinite;
}

.mfav__skeleton-img {
  aspect-ratio: 4/3;
  background: var(--spread-border);
  border-radius: 0;
}

.mfav__skeleton-line {
  height: 13px;
  background: var(--spread-border);
  border-radius: 4px;
  margin: 10px 12px 4px;
}

.mfav__skeleton-line--wide { width: 70%; }
.mfav__skeleton-line--narrow { width: 40%; }

@keyframes mfav-skeleton-fade {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ── Dark mode ── */
:global(html.dark) .mfav {
  --spread-surface: #1a0f14;
  --spread-bg: #1f1218;
  --spread-border: rgba(230, 216, 202, 0.12);
  --spread-text-primary: #f5f0eb;
  --spread-text-secondary: #e6d8ca;
  --spread-text-muted: rgba(230, 216, 202, 0.45);
}

:global(html.dark) .mfav__tab-count {
  background: rgba(230, 216, 202, 0.12);
  color: var(--spread-text-secondary);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .mfav__grid {
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 12px;
  }

  .mfav__tab {
    padding: 8px 12px;
    font-size: 13px;
  }

  .mfav__card-body {
    padding: 8px 10px 4px;
  }

  .mfav__card-actions {
    padding: 6px 10px 10px;
  }
}

@media (max-width: 480px) {
  .mfav__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

@media (min-width: 769px) {
  .mfav__grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
}
@media (min-width: 1024px) {
  .mfav__grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
}
@media (min-width: 1280px) {
  .mfav { padding: 20px 32px; }
  .mfav__grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
}
</style>
