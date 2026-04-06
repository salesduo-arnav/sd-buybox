import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface AlertAttributes {
    id: string;
    product_id: string;
    organization_id: string;
    integration_account_id: string;
    alert_type: string;
    severity: string;
    title: string | null;
    message: string | null;
    metadata: Record<string, unknown> | null;
    is_read: boolean;
    is_notified: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface AlertCreationAttributes extends Optional<AlertAttributes, 'id' | 'title' | 'message' | 'metadata' | 'is_read' | 'is_notified' | 'created_at' | 'updated_at' | 'deleted_at'> {}

class Alert extends Model<AlertAttributes, AlertCreationAttributes> implements AlertAttributes {
    declare id: string;
    declare product_id: string;
    declare organization_id: string;
    declare integration_account_id: string;
    declare alert_type: string;
    declare severity: string;
    declare title: string | null;
    declare message: string | null;
    declare metadata: Record<string, unknown> | null;
    declare is_read: boolean;
    declare is_notified: boolean;
    declare created_at: Date;
    declare updated_at: Date;
    declare deleted_at: Date | null;
}

Alert.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        product_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        organization_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        integration_account_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        alert_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
        },
        severity: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(300),
            allowNull: true,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_notified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        tableName: 'alerts',
        paranoid: true,
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

export default Alert;
