import numpy as np
from typing import Dict, Any, Optional

class EvolutionService:
    @staticmethod
    async def generate_evolution_data(planet_name: str, time_points: int = 100) -> Optional[Dict[str, Any]]:
        """
        基于恒星天体物理演化规律，生成 0 ~ 100 亿年 (0 ~ 10.0 Gyr) 的连续演化参数
        """
        name_clean = planet_name.lower().replace(" ", "").replace("-", "")
        
        # 时间轴：0.0 到 10.0 亿年 (Gyr)
        times = np.linspace(0.0, 10.0, time_points)
        
        # 预设基础容器
        star_radius = []
        star_temp = []
        star_phase = []
        star_color = []
        
        planet_temp = []
        planet_atmo = []
        planet_habit = []
        planet_orbit = []

        # -------------------------------------------------------------
        # 恒星演化阶段物理模拟 (以 1 个太阳质量类似宿主星模型为例)
        # 0 ~ 5.5 Gyr: 主序星阶段 (Main Sequence)
        # 5.5 ~ 7.5 Gyr: 亚巨星/红巨星膨胀 (Red Giant Branch)
        # 7.5 ~ 7.8 Gyr: 氦闪与渐近巨星支 (AGB) 抛射
        # 7.8 ~ 10.0 Gyr: 白矮星坍缩与缓慢冷却 (White Dwarf)
        # -------------------------------------------------------------
        
        is_trappist = "trappist" in name_clean
        base_temp = 251.0 if is_trappist else 272.0  # 行星初始平衡温度
        
        for t in times:
            if t < 5.0:
                # 1. 稳定主序星
                r_star = 1.0 + 0.08 * (t / 5.0)
                t_star = 5770.0 - 100.0 * (t / 5.0)
                phase = "主序星阶段 (Main Sequence)"
                color = "#FFD54F" # 暖黄色
                
                p_temp = base_temp + 8.0 * (t / 5.0)
                atmo = "氮氧/水汽稳定大气 (富液态水海洋)"
                habit = max(0.0, 0.95 - 0.1 * (t / 5.0))
                orbit = 0.029 if is_trappist else 0.143

            elif 5.0 <= t < 7.2:
                # 2. 恒星光度上升 -> 进入红巨星前夕（失控温室效应）
                progress = (t - 5.0) / 2.2
                r_star = 1.08 + 15.0 * (progress ** 2)
                t_star = 5670.0 - 1800.0 * progress
                phase = "红巨星膨胀阶段 (Red Giant Branch)"
                color = "#FF7043" # 橙红色
                
                p_temp = base_temp + 8.0 + 350.0 * (progress ** 1.5)
                atmo = "失控温室效应 (海洋蒸发至干涸)"
                habit = max(0.0, 0.8 - 0.8 * progress)
                orbit = 0.029 if is_trappist else 0.143

            elif 7.2 <= t < 7.8:
                # 3. 巨星极盛期（内行星熔融/大气彻底吹散）
                progress = (t - 7.2) / 0.6
                r_star = 16.0 + 80.0 * np.sin(progress * np.pi)
                t_star = 3400.0 - 500.0 * progress
                phase = "红巨星极大期与外层抛射 (Supergiant/AGB)"
                color = "#D50000" # 猩红色
                
                p_temp = 600.0 + 800.0 * progress
                atmo = "大气层完全剥离 (地表岩浆熔融)"
                habit = 0.0
                orbit = (0.029 if is_trappist else 0.143) * (1.0 + 0.3 * progress)

            else:
                # 4. 核心坍缩为白矮星 (WD 1856b 类似阶段)
                progress = (t - 7.8) / 2.2
                r_star = 0.015 + 0.005 * (1.0 - progress) # 坍缩至地球大小
                t_star = 25000.0 - 18000.0 * progress     # 从极高温度缓慢冷却
                phase = "白矮星阶段 (White Dwarf Relic)"
                color = "#E0F7FA" # 冰冷蓝白光
                
                p_temp = max(60.0, 300.0 - 220.0 * progress)
                atmo = "极寒冻结态 / 裸露岩石冰壳 (大气消亡)"
                habit = 0.0
                orbit = (0.029 if is_trappist else 0.143) * 1.35

            # 存入列表
            star_radius.append(float(round(r_star, 4)))
            star_temp.append(float(round(t_star, 1)))
            star_phase.append(phase)
            star_color.append(color)
            
            planet_temp.append(float(round(p_temp, 1)))
            planet_atmo.append(atmo)
            planet_habit.append(float(round(habit, 3)))
            planet_orbit.append(float(round(orbit, 5)))

        # 定义关键事件节点
        events = [
            {
                "time_gyr": 0.5,
                "title": "恒星吸积盘消散，行星定型",
                "description": "母恒星进入稳定主序阶段，行星表面水圈建立，宜居窗口开启。",
                "event_type": "habitable_start",
                "icon_type": "life"
            },
            {
                "time_gyr": 4.8,
                "title": "宜居窗口期关闭（温度阈值突破 373K）",
                "description": "恒星光度随核聚变副产物堆积而持续升高，行星表面液态水完全汽化，失控温室效应启动。",
                "event_type": "habitable_end",
                "icon_type": "warning"
            },
            {
                "time_gyr": 7.4,
                "title": "红巨星极端膨胀与太阳风暴",
                "description": "恒星体积急剧膨胀超数十倍，强恒星风彻底吹散行星残留大气层，内层轨道发生潮汐瓦解。",
                "event_type": "red_giant",
                "icon_type": "danger"
            },
            {
                "time_gyr": 8.5,
                "title": "白矮星幸存纪元 (类似 WD 1856b 现状)",
                "description": "恒星外壳抛射为行星状星云后留下致密白矮星核心，幸存行星进入漫长的极寒冷却期。",
                "event_type": "white_dwarf",
                "icon_type": "relic"
            }
        ]

        return {
            "planet_name": planet_name,
            "host_star_name": "TRAPPIST-1" if is_trappist else "K2-18",
            "total_timespan_gyr": 10.0,
            "habitable_window": {
                "start_time_gyr": 0.5,
                "end_time_gyr": 4.8,
                "peak_habitability_time_gyr": 2.2,
                "description": "行星表面温度处于 250K ~ 330K 之间，允许大面积液态水海洋稳定存在。"
            },
            "events": events,
            "star_evolution": {
                "time_gyr": [float(round(t, 2)) for t in times],
                "radius_solar": star_radius,
                "temperature_k": star_temp,
                "phase_label": star_phase,
                "color_hex": star_color
            },
            "planet_evolution": {
                "time_gyr": [float(round(t, 2)) for t in times],
                "temperature_k": planet_temp,
                "atmosphere_state": planet_atmo,
                "habitability_index": planet_habit,
                "orbital_radius_au": planet_orbit
            }
        }