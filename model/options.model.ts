export type SocketOptionCategory = 'screw' | 'light';

export interface SocketOptions {
    _id: string;
    screwTypes: string[];
    lightTypes: string[];
    updatedAt?: string;
}

export const DEFAULT_SOCKET_OPTIONS: SocketOptions = {
    _id: 'socket_options',
    screwTypes: ['E27', 'G9', 'GU10', 'LED (Integrated)', 'Mixed: GU10 + E27', 'Mixed: G9 + E27'],
    lightTypes: [
        'LED - Max 5W',
        'LED - Max 7W',
        'LED - Max 9W',
        'LED - Max 10W',
        'LED - Max 15W',
        'LED - Max 20W',
        'LED - Max 35W',
        'LED - Max 36W'
    ]
};

