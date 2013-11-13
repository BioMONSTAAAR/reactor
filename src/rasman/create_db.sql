
CREATE TABLE sensor_data (
    timestamp TEXT NOT NULL,
    controller_id TEXT NOT NULL,
    data TEXT NOT NULL,
    uploaded INTEGER DEFAULT 0
);

