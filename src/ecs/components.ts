// Jumlah maksimum entitas
export const MAX_ENTITIES = 10000;

// Komponen posisi (SoA)
export const Position = {
	x: new Float32Array(MAX_ENTITIES),
	y: new Float32Array(MAX_ENTITIES),
};

// Komponen referensi sprite
export const SpriteRef = {
	id: new Uint32Array(MAX_ENTITIES),
};

// Komponen referensi body
export const BodyRef = {
	id: new Uint32Array(MAX_ENTITIES),
};

// Komponen tag (AoS)
export const BirdTag = [] as number[];

// Komponen appearance (varian warna, enum)
export const BirdAppearance = {
	variant: new Uint8Array(MAX_ENTITIES),
};