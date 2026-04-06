import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TrackerConfigAttributes {
    id: string;
    integration_account_id: string;
    organization_id: string;
    tracking_scope: string;
    specific_asins: string[] | null;
    schedule_enabled: boolean;
    update_frequency: string;
    schedule_time: string | null;
    last_scheduled_run_at: Date | null;
    next_scheduled_run_at: Date | null;
    email_alerts_enabled: boolean;
    slack_alerts_enabled: boolean;
    critical_alerts_only: boolean;
    notification_emails: string[] | null;
    slack_channel_id: string | null;
    visibility_warning_threshold: number;
    visibility_critical_threshold: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface TrackerConfigCreationAttributes extends Optional<TrackerConfigAttributes, 'id' | 'tracking_scope' | 'specific_asins' | 'schedule_enabled' | 'update_frequency' | 'schedule_time' | 'last_scheduled_run_at' | 'next_scheduled_run_at' | 'email_alerts_enabled' | 'slack_alerts_enabled' | 'critical_alerts_only' | 'notification_emails' | 'slack_channel_id' | 'visibility_warning_threshold' | 'visibility_critical_threshold' | 'created_at' | 'updated_at' | 'deleted_at'> {}

class TrackerConfig extends Model<TrackerConfigAttributes, TrackerConfigCreationAttributes> implements TrackerConfigAttributes {
    declare id: string;
    declare integration_account_id: string;
    declare organization_id: string;
    declare tracking_scope: string;
    declare specific_asins: string[] | null;
    declare schedule_enabled: boolean;
    declare update_frequency: string;
    declare schedule_time: string | null;
    declare last_scheduled_run_at: Date | null;
    declare next_scheduled_run_at: Date | null;
    declare email_alerts_enabled: boolean;
    declare slack_alerts_enabled: boolean;
    declare critical_alerts_only: boolean;
    declare notification_emails: string[] | null;
    declare slack_channel_id: string | null;
    declare visibility_warning_threshold: number;
    declare visibility_critical_threshold: number;
    declare created_at: Date;
    declare updated_at: Date;
    declare deleted_at: Date | null;
}

TrackerConfig.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        integration_account_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
        },
        organization_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        tracking_scope: {
            type: DataTypes.STRING(10),
            defaultValue: 'all',
        },
        specific_asins: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        schedule_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        update_frequency: {
            type: DataTypes.STRING(10),
            defaultValue: 'hourly',
        },
        schedule_time: {
            type: DataTypes.STRING(5),
            allowNull: true,
        },
        last_scheduled_run_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        next_scheduled_run_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        email_alerts_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        slack_alerts_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        critical_alerts_only: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        notification_emails: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        slack_channel_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        visibility_warning_threshold: {
            type: DataTypes.INTEGER,
            defaultValue: 50,
        },
        visibility_critical_threshold: {
            type: DataTypes.INTEGER,
            defaultValue: 25,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'tracker_configs',
        paranoid: true,
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

export default TrackerConfig;
