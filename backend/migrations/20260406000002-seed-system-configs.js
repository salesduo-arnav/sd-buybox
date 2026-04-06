'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const configs = [
            {
                config_key: 'supported_marketplaces',
                config_value: JSON.stringify(["US", "CA", "UK", "DE", "FR", "IT", "ES", "JP", "AU", "IN", "MX", "BR"]),
                description: 'Available marketplaces for tracking',
            },
            {
                config_key: 'default_update_frequency',
                config_value: JSON.stringify("hourly"),
                description: 'Default scan frequency for new accounts',
            },
            {
                config_key: 'max_products_per_scan',
                config_value: JSON.stringify(500),
                description: 'Maximum products processed in a single scan batch',
            },
            {
                config_key: 'real_time_interval_minutes',
                config_value: JSON.stringify(15),
                description: 'Polling interval for real-time mode (minutes)',
            },
            {
                config_key: 'snapshot_retention_days',
                config_value: JSON.stringify(90),
                description: 'Snapshots older than this are deleted by cleanup job',
            },
            {
                config_key: 'visibility_warning_default',
                config_value: JSON.stringify(50),
                description: 'Default warning threshold percentage',
            },
            {
                config_key: 'visibility_critical_default',
                config_value: JSON.stringify(25),
                description: 'Default critical threshold percentage',
            },
            {
                config_key: 'missed_sales_min_velocity',
                config_value: JSON.stringify(0.5),
                description: 'Minimum daily units to calculate missed sales (avoids noise)',
            },
        ];

        const now = new Date();
        for (const config of configs) {
            await queryInterface.bulkInsert('system_configs', [{
                id: require('crypto').randomUUID(),
                config_key: config.config_key,
                config_value: config.config_value,
                description: config.description,
                created_at: now,
                updated_at: now,
            }]);
        }
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('system_configs', null, {});
    },
};
