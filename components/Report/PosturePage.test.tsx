import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Member, PostureAssessment } from '../../types';
import PosturePage from './PosturePage';

describe('PosturePage V2 PDF layout', () => {
  it('keeps native-proportion landmark evidence and omits the 2.5D panel', () => {
    const assessment: PostureAssessment = {
      id: 'a1', date: '2026-07-13', schemaVersion: 2,
      protocolVersion: 'posture-photo-v2.0', modelVersion: 'test-model',
      frontImage: 'data:image/png;base64,AA==', sideImage: 'data:image/png;base64,AA==',
      report: { score: null, trendIndex: null, confidence: 0.9, issues: [] },
      correctionPlan: { week1_2: [], week3_4: [] },
      capture: { mode: 'guided', standardized: true, comparable: true, quality: {} },
      measurements: [{
        id: 'shoulder_line', name: '肩峰连线角', nameEn: 'Acromion line angle', view: 'front',
        value: 2, unit: '°', uncertainty: 1, confidence: 0.9, status: 'measured',
        trackable: false, direction: '右侧向下为正', landmarkIds: ['left_shoulder', 'right_shoulder'],
        description: '', descriptionEn: '', validated: false,
      }],
      views: {
        front: {
          view: 'front', landmarks: {}, world_landmarks: {}, markers: {}, engine: 'test',
          quality: {
            status: 'good', capture_mode: 'guided', protocol_acknowledged: true,
            standardized: true, comparable: true, visibility: 0.9, body_height_ratio: 0.8,
            center_x: 0.5, shoulder_width_ratio: 0.2, orientation_ok: true,
            marker_completeness: 1, warnings: [],
          },
        },
      },
      reconstruction: {
        available: true, kind: '2.5d', nodes: {
          left_shoulder: { x: -0.2, y: 1.4, z: 0, confidence: 0.9 },
          right_shoulder: { x: 0.2, y: 1.4, z: 0, confidence: 0.9 },
        }, bones: [['left_shoulder', 'right_shoulder']],
      },
    };
    const member: Member = {
      id: 'm1', name: '测试会员', avatar: '', joinDate: '2026-01-01', gender: 'female',
      heightCm: 165, workouts: [], assessments: [assessment],
    };
    const html = renderToStaticMarkup(<PosturePage member={member} lang="zh" studioName="NeonFit" />);
    expect(html).toContain('data:image/png;base64,AA==');
    expect(html).toContain('保持真人原始比例');
    expect(html).toContain('照片角度摘要');
    expect(html).not.toContain('2.5D 估算');
  });
});
