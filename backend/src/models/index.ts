import Product from './product';
import BuyBoxSnapshot from './buybox_snapshot';
import Scan from './scan';
import Alert from './alert';
import TrackerConfig from './tracker_config';
import SystemConfig from './system_config';

// Product -> BuyBoxSnapshots (one-to-many)
Product.hasMany(BuyBoxSnapshot, { foreignKey: 'product_id', as: 'snapshots' });
BuyBoxSnapshot.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Scan -> BuyBoxSnapshots (one-to-many)
Scan.hasMany(BuyBoxSnapshot, { foreignKey: 'scan_id', as: 'snapshots' });
BuyBoxSnapshot.belongsTo(Scan, { foreignKey: 'scan_id', as: 'scan' });

// Product -> Alerts (one-to-many)
Product.hasMany(Alert, { foreignKey: 'product_id', as: 'alerts' });
Alert.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

export {
    Product,
    BuyBoxSnapshot,
    Scan,
    Alert,
    TrackerConfig,
    SystemConfig,
};
