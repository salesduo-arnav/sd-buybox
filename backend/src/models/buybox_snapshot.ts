import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface BuyBoxSnapshotAttributes {
    id: string;
    product_id: string;
    scan_id: string;
    organization_id: string;
    integration_account_id: string;
    has_buybox: boolean;
    is_suppressed: boolean;
    our_price: number | null;
    buybox_price: number | null;
    lowest_3p_price: number | null;
    winner_type: string | null;
    loss_reason: string | null;
    est_missed_sales: number;
    snapshot_at: Date;
}

export interface BuyBoxSnapshotCreationAttributes extends Optional<BuyBoxSnapshotAttributes, 'id' | 'is_suppressed' | 'our_price' | 'buybox_price' | 'lowest_3p_price' | 'winner_type' | 'loss_reason' | 'est_missed_sales' | 'snapshot_at'> {}

class BuyBoxSnapshot extends Model<BuyBoxSnapshotAttributes, BuyBoxSnapshotCreationAttributes> implements BuyBoxSnapshotAttributes {
    declare id: string;
    declare product_id: string;
    declare scan_id: string;
    declare organization_id: string;
    declare integration_account_id: string;
    declare has_buybox: boolean;
    declare is_suppressed: boolean;
    declare our_price: number | null;
    declare buybox_price: number | null;
    declare lowest_3p_price: number | null;
    declare winner_type: string | null;
    declare loss_reason: string | null;
    declare est_missed_sales: number;
    declare snapshot_at: Date;
}

BuyBoxSnapshot.init(
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
        scan_id: {
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
        has_buybox: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        is_suppressed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        our_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        buybox_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        lowest_3p_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        winner_type: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        loss_reason: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        est_missed_sales: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
        },
        snapshot_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'buybox_snapshots',
        underscored: true,
        timestamps: false,
    }
);

export default BuyBoxSnapshot;
