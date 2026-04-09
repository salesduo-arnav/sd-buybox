// Catalog Service
//
// Syncs product metadata and sales velocity from SP-API.
//
// When implemented, syncProducts should enforce the tracked_asins limit
// inside the same transaction as the insert: call entitlements.snapshot,
// COUNT(*) products for the org, and use entitlements.requireCapacity
// with LIMIT.TRACKED_ASINS before each insert.

class CatalogService {
    // TODO: Implement syncProducts(integrationAccountId, credentials)
    // TODO: Implement updateSalesVelocity(integrationAccountId, credentials)
}

export default new CatalogService();
