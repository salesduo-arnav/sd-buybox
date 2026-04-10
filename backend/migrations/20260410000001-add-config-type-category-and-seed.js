'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1A — Add config_type and category columns
        await queryInterface.addColumn('system_configs', 'config_type', {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'text',
        });
        await queryInterface.addColumn('system_configs', 'category', {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'general',
        });

        // 1B — Backfill existing configs with correct type and category
        const updates = [
            { key: 'supported_marketplaces',   config_type: 'json',    category: 'scanning' },
            { key: 'default_update_frequency', config_type: 'select',  category: 'scanning' },
            { key: 'max_products_per_scan',    config_type: 'integer', category: 'scanning' },
            { key: 'real_time_interval_minutes', config_type: 'integer', category: 'scanning' },
            { key: 'snapshot_retention_days',  config_type: 'integer', category: 'data_retention' },
            { key: 'visibility_warning_default',  config_type: 'integer', category: 'thresholds' },
            { key: 'visibility_critical_default', config_type: 'integer', category: 'thresholds' },
            { key: 'missed_sales_min_velocity',   config_type: 'decimal', category: 'thresholds' },
        ];

        for (const { key, config_type, category } of updates) {
            await queryInterface.sequelize.query(
                `UPDATE system_configs SET config_type = :config_type, category = :category WHERE config_key = :key`,
                { replacements: { config_type, category, key } }
            );
        }

        // 1C — Seed new configs
        const newConfigs = [
            {
                config_key: 'default_marketplace',
                config_value: JSON.stringify('US'),
                config_type: 'select',
                category: 'scanning',
                description: 'Default marketplace for scan requests',
            },
            {
                config_key: 'entitlement_frequency_fallback',
                config_value: JSON.stringify('daily'),
                config_type: 'select',
                category: 'entitlements',
                description: 'Fallback frequency when org has no entitlement tier',
            },
            {
                config_key: 'entitlement_retention_default_days',
                config_value: JSON.stringify(30),
                config_type: 'integer',
                category: 'entitlements',
                description: 'Default retention in days when org has no retention entitlement',
            },
            {
                config_key: 'entitlement_retention_unlimited_ceiling_days',
                config_value: JSON.stringify(3650),
                config_type: 'integer',
                category: 'entitlements',
                description: 'Ceiling for unlimited retention to keep cleanup queries bounded',
            },
        ];

        const now = new Date();
        for (const config of newConfigs) {
            await queryInterface.bulkInsert('system_configs', [{
                id: require('crypto').randomUUID(),
                ...config,
                created_at: now,
                updated_at: now,
            }]);
        }
    },

    async down(queryInterface) {
        // Remove new configs
        const newKeys = [
            'default_marketplace',
            'entitlement_frequency_fallback',
            'entitlement_retention_default_days',
            'entitlement_retention_unlimited_ceiling_days',
        ];
        await queryInterface.sequelize.query(
            `DELETE FROM system_configs WHERE config_key IN (:keys)`,
            { replacements: { keys: newKeys } }
        );

        // Remove columns
        await queryInterface.removeColumn('system_configs', 'category');
        await queryInterface.removeColumn('system_configs', 'config_type');
    },
};
