const migrations = [
    {
        from: '1.0',
        to: '1.1',
        migrate: (data) => {
            // 未来版本迁移逻辑
            return data;
        }
    }
];
export class VersionManager {
    static validateVersion(version) {
        return ['1.0'].includes(version);
    }
    static migrate(data) {
        let current = data;
        while (true) {
            const migration = migrations.find(m => m.from === current.version);
            if (!migration)
                break;
            current = migration.migrate(current);
        }
        return current;
    }
    static getLatestVersion() {
        return '1.0';
    }
}
