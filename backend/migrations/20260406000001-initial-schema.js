'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // ── PRODUCTS ──────────────────────────────────────
        await queryInterface.createTable('products', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            integration_account_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            organization_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            asin: {
                type: Sequelize.STRING(20),
                allowNull: false,
            },
            sku: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            title: {
                type: Sequelize.STRING(500),
                allowNull: true,
            },
            image_url: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            is_top_product: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            track_buybox: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            estimated_daily_units: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            average_selling_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            last_synced_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });

        await queryInterface.addIndex('products', ['integration_account_id', 'asin'], {
            unique: true,
            name: 'idx_products_account_asin',
        });
        await queryInterface.addIndex('products', ['organization_id'], {
            name: 'idx_products_org',
        });

        // ── SCANS ─────────────────────────────────────────
        await queryInterface.createTable('scans', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            integration_account_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            organization_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            triggered_by: {
                type: Sequelize.STRING(20),
                allowNull: false,
            },
            status: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'queued',
            },
            marketplace: {
                type: Sequelize.STRING(10),
                allowNull: false,
                defaultValue: 'US',
            },
            total_products: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            scanned_products: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            issues_found: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            started_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            completed_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            error_message: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            job_id: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });

        await queryInterface.addIndex('scans', ['integration_account_id', 'status'], {
            name: 'idx_scans_account_status',
        });

        // ── BUYBOX SNAPSHOTS ──────────────────────────────
        await queryInterface.createTable('buybox_snapshots', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'products', key: 'id' },
                onDelete: 'CASCADE',
            },
            scan_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'scans', key: 'id' },
                onDelete: 'CASCADE',
            },
            organization_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            integration_account_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            has_buybox: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
            },
            is_suppressed: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            our_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            buybox_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            lowest_3p_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            winner_type: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            loss_reason: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            est_missed_sales: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0,
            },
            snapshot_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
        });

        await queryInterface.addIndex('buybox_snapshots', ['product_id', 'snapshot_at'], {
            name: 'idx_snapshots_product_time',
        });
        await queryInterface.addIndex('buybox_snapshots', ['organization_id', 'snapshot_at'], {
            name: 'idx_snapshots_org_time',
        });

        // ── ALERTS ────────────────────────────────────────
        await queryInterface.createTable('alerts', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'products', key: 'id' },
                onDelete: 'CASCADE',
            },
            organization_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            integration_account_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            alert_type: {
                type: Sequelize.STRING(30),
                allowNull: false,
            },
            severity: {
                type: Sequelize.STRING(10),
                allowNull: false,
            },
            title: {
                type: Sequelize.STRING(300),
                allowNull: true,
            },
            message: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            metadata: {
                type: Sequelize.JSONB,
                allowNull: true,
            },
            is_read: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            is_notified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });

        await queryInterface.addIndex('alerts', ['organization_id', 'is_read', 'created_at'], {
            name: 'idx_alerts_org_unread',
        });
        await queryInterface.addIndex('alerts', ['product_id', 'created_at'], {
            name: 'idx_alerts_product',
        });

        // ── TRACKER CONFIGS ───────────────────────────────
        await queryInterface.createTable('tracker_configs', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            integration_account_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true,
            },
            organization_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            tracking_scope: {
                type: Sequelize.STRING(10),
                defaultValue: 'all',
            },
            specific_asins: {
                type: Sequelize.JSONB,
                allowNull: true,
            },
            schedule_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            update_frequency: {
                type: Sequelize.STRING(10),
                defaultValue: 'hourly',
            },
            schedule_time: {
                type: Sequelize.STRING(5),
                allowNull: true,
            },
            last_scheduled_run_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            next_scheduled_run_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            email_alerts_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            slack_alerts_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            critical_alerts_only: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            notification_emails: {
                type: Sequelize.JSONB,
                allowNull: true,
            },
            slack_channel_id: {
                type: Sequelize.STRING(50),
                allowNull: true,
            },
            visibility_warning_threshold: {
                type: Sequelize.INTEGER,
                defaultValue: 50,
            },
            visibility_critical_threshold: {
                type: Sequelize.INTEGER,
                defaultValue: 25,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
        });

        // ── SYSTEM CONFIGS ────────────────────────────────
        await queryInterface.createTable('system_configs', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
            },
            config_key: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            config_value: {
                type: Sequelize.JSONB,
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('NOW()'),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('buybox_snapshots');
        await queryInterface.dropTable('alerts');
        await queryInterface.dropTable('scans');
        await queryInterface.dropTable('tracker_configs');
        await queryInterface.dropTable('system_configs');
        await queryInterface.dropTable('products');
    },
};
