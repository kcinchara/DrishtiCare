import cv2
import numpy as np
from pathlib import Path
from app.config import settings

def generate_synthetic_fundus(
    grade: int = 2,
    filename: str = "demo_fundus.jpg",
    field_center: str = "macula",
    seed: int = 42,
    force_recreate: bool = False
) -> str:
    """
    Generates a realistic synthetic retinal fundus image with optic disc, vascular arcade,
    macula, and grade-specific diabetic retinopathy lesions for testing and training.
    Supports:
      - Variable pigmentation (pale, orange-red, dark reddish-brown)
      - Realistic vascular arcades and choroidal grain
      - Distinct ICDR Grade 0–4 lesion features
    """
    filepath = settings.UPLOAD_DIR / filename
    if filepath.exists() and not force_recreate:
        return str(filepath)

    actual_seed = int(grade * 1000 + seed) if seed == 42 else int(seed)
    rng = np.random.RandomState(actual_seed)

    size = 512
    img = np.zeros((size, size, 3), dtype=np.uint8)

    # 1. Retinal background circular aperture
    center = (size // 2, size // 2)
    radius = int(size * 0.46)
    y, x = np.ogrid[:size, :size]
    dist_from_center = np.sqrt((x - center[0])**2 + (y - center[1])**2)
    fundus_mask = dist_from_center <= radius

    # 2. Variable pigmentation base colors (pale Asian/Caucasian, standard orange-red, deep brown)
    pigment_style = rng.choice(["standard", "pale", "deep"])
    norm_dist = dist_from_center / radius

    if pigment_style == "pale":
        b_base, g_base, r_base = (20, 65, 190)
    elif pigment_style == "deep":
        b_base, g_base, r_base = (8, 35, 130)
    else:
        b_base, g_base, r_base = (15, 50, 165)

    b = np.clip(b_base + 15 * (1 - norm_dist) + rng.normal(0, 3, (size, size)), 0, 255)
    g = np.clip(g_base + 35 * (1 - norm_dist) + rng.normal(0, 4, (size, size)), 0, 255)
    r = np.clip(r_base + 45 * (1 - norm_dist) + rng.normal(0, 5, (size, size)), 0, 255)

    bg = np.dstack([b, g, r]).astype(np.uint8)
    img[fundus_mask] = bg[fundus_mask]

    # Field positions
    if field_center == "disc":
        disc_x = int(size * (0.46 + rng.uniform(-0.03, 0.03)))
        disc_y = int(size * (0.50 + rng.uniform(-0.03, 0.03)))
        mac_x = int(size * (0.78 + rng.uniform(-0.03, 0.03)))
        mac_y = int(size * (0.52 + rng.uniform(-0.03, 0.03)))
    else:
        disc_x = int(size * (0.24 + rng.uniform(-0.03, 0.03)))
        disc_y = int(size * (0.50 + rng.uniform(-0.03, 0.03)))
        mac_x = int(size * (0.55 + rng.uniform(-0.03, 0.03)))
        mac_y = int(size * (0.52 + rng.uniform(-0.03, 0.03)))

    disc_center = (disc_x, disc_y)
    macula_center = (mac_x, mac_y)

    # 3. Optic Disc (Bright yellowish circle with physiological cup)
    disc_radius = int(size * (0.075 + rng.uniform(-0.005, 0.01)))
    disc_color = (int(rng.uniform(110, 140)), int(rng.uniform(210, 235)), int(rng.uniform(235, 255)))
    cup_color = (int(rng.uniform(130, 160)), int(rng.uniform(230, 250)), 255)
    cv2.circle(img, disc_center, disc_radius, disc_color, -1)
    cv2.circle(img, disc_center, int(disc_radius * 0.48), cup_color, -1)

    # 4. Fovea / Macula (Darker reddish oval with central foveola)
    mac_w = int(size * (0.11 + rng.uniform(-0.01, 0.01)))
    mac_h = int(size * (0.085 + rng.uniform(-0.01, 0.01)))
    cv2.ellipse(img, macula_center, (mac_w, mac_h), 0, 0, 360, (15, 35, 120), -1)
    cv2.circle(img, macula_center, 3, (8, 20, 95), -1)

    # 5. Retinal Vascular Arcade (Superior & Inferior major branches)
    vessel_color = (int(rng.uniform(12, 22)), int(rng.uniform(15, 28)), int(rng.uniform(90, 125)))
    pts_sup = np.array([
        disc_center,
        (int(disc_center[0] + size * 0.10), int(size * (0.32 + rng.uniform(-0.03, 0.03)))),
        (int(disc_center[0] + size * 0.25), int(size * (0.24 + rng.uniform(-0.02, 0.03)))),
        (int(disc_center[0] + size * 0.45), int(size * (0.28 + rng.uniform(-0.03, 0.03)))),
        (min(size - 25, int(disc_center[0] + size * 0.60)), int(size * (0.38 + rng.uniform(-0.03, 0.03))))
    ], np.int32)
    cv2.polylines(img, [pts_sup], False, vessel_color, thickness=3, lineType=cv2.LINE_AA)

    pts_inf = np.array([
        disc_center,
        (int(disc_center[0] + size * 0.10), int(size * (0.68 + rng.uniform(-0.03, 0.03)))),
        (int(disc_center[0] + size * 0.26), int(size * (0.75 + rng.uniform(-0.03, 0.03)))),
        (int(disc_center[0] + size * 0.46), int(size * (0.71 + rng.uniform(-0.03, 0.03)))),
        (min(size - 25, int(disc_center[0] + size * 0.60)), int(size * (0.62 + rng.uniform(-0.03, 0.03))))
    ], np.int32)
    cv2.polylines(img, [pts_inf], False, vessel_color, thickness=3, lineType=cv2.LINE_AA)

    # Secondary vessel branches
    for _ in range(4):
        bx = int(rng.uniform(disc_center[0] + size * 0.05, min(size - 40, disc_center[0] + size * 0.45)))
        by = int(rng.uniform(size * 0.22, size * 0.78))
        dx = int(rng.uniform(-30, 30))
        dy = int(rng.uniform(-30, 30))
        cv2.line(img, (bx, by), (bx + dx, by + dy), vessel_color, 1, cv2.LINE_AA)

    # 6. Inject Clinically Accurate DR Grade-Specific Lesions
    # Clinical definitions:
    # DR 0: Zero lesions, healthy retinal vasculature & background
    # DR 1 (Mild NPDR): 3 to 6 isolated focal microaneurysms ONLY in macular arcade, no exudates, no hemorrhages
    # DR 2 (Moderate NPDR): 8 to 16 microaneurysms + 5 to 12 sharp yellow hard exudates + 2 to 4 blot hemorrhages
    # DR 3 (Severe NPDR): 20 to 30 extensive dot-blot hemorrhages across all 4 quadrants + 3 to 6 cotton-wool spots (fluffy white infarcts)
    # DR 4 (Proliferative DR): Neovascularization fronds (NVD/NVE) + large preretinal/vitreous boat-shaped hemorrhage

    ma_color = (int(rng.uniform(6, 15)), int(rng.uniform(8, 20)), int(rng.uniform(130, 165)))

    if grade == 1:
        # Mild NPDR: 4 to 8 isolated microaneurysms only (distinct focal dark-red/burgundy capillary outpouchings)
        num_ma = rng.randint(4, 8)
        for _ in range(num_ma):
            mx = int(rng.uniform(macula_center[0] - size * 0.16, min(size - 35, macula_center[0] + size * 0.20)))
            my = int(rng.uniform(size * 0.30, size * 0.70))
            r_ma = rng.randint(3, 5)
            # High-absorption deep red/burgundy lesion (B=4, G=4, R=140)
            cv2.circle(img, (mx, my), r_ma, (4, 6, int(rng.uniform(130, 165))), -1)
            cv2.circle(img, (mx, my), r_ma, (1, 3, 90), 1)

    elif grade == 2:
        # Moderate NPDR: Microaneurysms + distinct bright yellow hard exudates + mild blot hemorrhages
        num_ma = rng.randint(8, 16)
        for _ in range(num_ma):
            mx = int(rng.uniform(macula_center[0] - size * 0.18, min(size - 35, macula_center[0] + size * 0.24)))
            my = int(rng.uniform(size * 0.26, size * 0.74))
            cv2.circle(img, (mx, my), rng.randint(3, 5), ma_color, -1)

        # Hard Exudates: Sharp yellowish-white lipid clusters near the macula
        num_he = rng.randint(6, 12)
        for _ in range(num_he):
            hx = int(rng.uniform(macula_center[0] - size * 0.14, min(size - 25, macula_center[0] + size * 0.16)))
            hy = int(rng.uniform(size * 0.38, size * 0.66))
            exudate_color = (int(rng.uniform(35, 65)), int(rng.uniform(215, 245)), int(rng.uniform(235, 255)))
            cv2.circle(img, (hx, hy), rng.randint(3, 6), exudate_color, -1)
            # Occasional circinate hard exudate satellite
            if rng.rand() > 0.5:
                cv2.circle(img, (hx + rng.randint(-8, 8), hy + rng.randint(-8, 8)), rng.randint(2, 4), exudate_color, -1)

        # Few blot hemorrhages
        num_hem = rng.randint(2, 5)
        for _ in range(num_hem):
            bx = int(rng.uniform(disc_center[0] + size * 0.08, min(size - 35, macula_center[0] + size * 0.22)))
            by = int(rng.uniform(size * 0.28, size * 0.72))
            hem_color = (int(rng.uniform(4, 12)), int(rng.uniform(6, 16)), int(rng.uniform(115, 145)))
            cv2.ellipse(img, (bx, by), (rng.randint(5, 9), rng.randint(3, 6)), rng.randint(0, 180), 0, 360, hem_color, -1)

    elif grade == 3:
        # Severe NPDR: Extensive intraretinal hemorrhages in all 4 quadrants + multiple cotton-wool spots
        num_ma = rng.randint(16, 26)
        for _ in range(num_ma):
            mx = int(rng.uniform(disc_center[0] + 10, size - 35))
            my = int(rng.uniform(size * 0.16, size * 0.84))
            cv2.circle(img, (mx, my), rng.randint(3, 5), ma_color, -1)

        # 4-quadrant hemorrhages (extensive dot and blot bleeds)
        num_hem = rng.randint(18, 30)
        for _ in range(num_hem):
            hx = int(rng.uniform(disc_center[0] + 10, size - 35))
            hy = int(rng.uniform(size * 0.15, size * 0.85))
            hem_color = (int(rng.uniform(3, 10)), int(rng.uniform(5, 14)), int(rng.uniform(105, 135)))
            cv2.ellipse(img, (hx, hy), (rng.randint(6, 12), rng.randint(4, 7)), rng.randint(0, 180), 0, 360, hem_color, -1)

        # Cotton wool spots (fluffy nerve-fiber layer infarcts, pale grayish-white)
        num_cws = rng.randint(3, 7)
        for _ in range(num_cws):
            sx = int(rng.uniform(macula_center[0] - size * 0.20, min(size - 40, macula_center[0] + size * 0.22)))
            sy = int(rng.uniform(size * 0.25, size * 0.75))
            cws_color = (int(rng.uniform(165, 195)), int(rng.uniform(195, 225)), int(rng.uniform(220, 245)))
            cv2.ellipse(img, (sx, sy), (rng.randint(9, 15), rng.randint(6, 11)), rng.randint(0, 180), 0, 360, cws_color, -1)

    elif grade == 4:
        # Proliferative DR: Neovascularization vessel fronds + preretinal/vitreous boat hemorrhage
        num_hem = rng.randint(10, 18)
        for _ in range(num_hem):
            hx = int(rng.uniform(disc_center[0] + 15, size - 40))
            hy = int(rng.uniform(size * 0.20, size * 0.80))
            cv2.ellipse(img, (hx, hy), (rng.randint(6, 14), rng.randint(4, 8)), rng.randint(0, 180), 0, 360, (3, 3, int(rng.uniform(105, 135))), -1)

        # NVD / NVE vessel fronds at optic disc and arcade
        for base_point in [disc_center, (int(disc_center[0] + size * 0.25), int(size * 0.25)), (int(disc_center[0] + size * 0.25), int(size * 0.75))]:
            for _ in range(8):
                ex = base_point[0] + rng.randint(-26, 26)
                ey = base_point[1] + rng.randint(-26, 26)
                cv2.line(img, base_point, (ex, ey), (6, 10, 115), 1, cv2.LINE_AA)

        # Large boat-shaped preretinal / vitreous hemorrhage
        px = int(macula_center[0] + rng.uniform(-size * 0.08, size * 0.08))
        py = int(size * (0.60 + rng.uniform(-0.05, 0.05)))
        cv2.ellipse(img, (px, py), (24, 13), rng.randint(-20, 20), 0, 180, (2, 2, 90), -1)

    # 7. Apply gentle bilateral filtering for natural photographic texture without washing lesions
    img = cv2.bilateralFilter(img, d=5, sigmaColor=25, sigmaSpace=25)

    # 8. Re-apply circular aperture mask
    img[~fundus_mask] = 0

    cv2.imwrite(str(filepath), img)
    return str(filepath)
