export interface Event {
    recording_id: string;
    type: string;
    name: string;
    timestamp_ns: number;
    utx_timestamp_ns: number;
}