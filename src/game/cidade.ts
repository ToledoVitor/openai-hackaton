import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { LearningMissionId } from '../domain/learning-journey';
import { MISSION_SCENE_LOCATIONS, urbanProblemRemains } from './mission-scene';

const BASE = '/assets/3d/cidade';

export class Cidade {
  readonly grupo = new THREE.Group();
  readonly alvosProjeto: THREE.Object3D[] = [];
  readonly alvosNpc: THREE.Object3D[] = [];

  private mixers: THREE.AnimationMixer[] = [];
  private personagens: THREE.Object3D[] = [];
  private decisoes: string[] = [];
  private veiculos: Array<{
    objeto: THREE.Object3D;
    eixo: 'x' | 'z';
    faixa: string;
    minimo: number;
    maximo: number;
    velocidade: number;
    velocidadeAtual: number;
    sentido: 1 | -1;
  }> = [];
  private ritmoTransito = 1;
  private destaque: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | null = null;
  private barreiras: THREE.Group | null = null;
  private escolaCompacta: THREE.Object3D | null = null;
  private escolaPatio: THREE.Object3D | null = null;
  private centroBasico: THREE.Object3D | null = null;
  private centroCompleto: THREE.Object3D | null = null;
  private fumacaConstrucao: THREE.Group | null = null;
  private timerConstrucao = 0;
  private semaforos: THREE.Group | null = null;
  private ruaCalma: THREE.Group | null = null;
  private lixoProblema: THREE.Group | null = null;
  private coletaOrganizada: THREE.Group | null = null;
  private torreAgua: THREE.Object3D | null = null;
  private laboratorio: THREE.Group | null = null;
  private biblioteca: THREE.Group | null = null;
  private celebracao: THREE.Group | null = null;
  private tempo = 0;
  private pulso = 0;

  constructor() {
    this.grupo.name = 'cidade-viva';
  }

  async construir() {
    const loader = new GLTFLoader();
    const [
      predioA, predioC, predioE, predioF, predioG, predioH, escolaCompacta,
      escolaPatio, taxi, sedan, hatchback, poste,
      semaforo, banco, arbusto, caixa, lixeira, lixo, torreAgua, prefeito, operario,
    ] = await Promise.all([
      'building_A.gltf', 'building_C.gltf', 'building_E.gltf', 'building_F.gltf',
      'building_G.gltf', 'building_H.gltf', 'building_B.gltf', 'building_D.gltf',
      'car_taxi.gltf', 'car_sedan.gltf', 'car_hatchback.gltf', 'streetlight.gltf',
      'trafficlight_A.gltf', 'bench.gltf', 'bush.gltf', 'box_A.gltf',
      'dumpster.gltf', 'trash_A.gltf', 'watertower.gltf', 'prefeito.gltf',
      'operario.gltf',
    ].map((arquivo) => this.carregar(loader, arquivo)));

    this.construirBase();
    this.construirLuzes();
    this.construirRuas();
    this.construirBairro([
      predioA.scene, predioC.scene, predioE.scene, predioF.scene,
      predioG.scene, predioH.scene, predioA.scene.clone(), predioC.scene.clone(),
    ]);
    this.construirArborizacao();
    this.construirTransito(taxi.scene, sedan.scene, hatchback.scene);
    [
      [-12.5, 0.12, 3.1], [-1.5, 0.12, 3.1], [4.3, 0.12, 3.1],
      [9.2, 0.12, -1.7], [9.2, 0.12, -6.2],
    ].forEach((posicao, indice) => {
      this.adicionarNoChao(indice === 0 ? poste.scene : poste.scene.clone(), posicao as [number, number, number], 2.4);
    });
    this.adicionarNoChao(arbusto.scene, [-13.5, 0.12, 5.1], 2.4);
    this.adicionarNoChao(arbusto.scene.clone(), [13.5, 0.12, 5.1], 2.4);
    this.adicionarNoChao(caixa.scene, [11.9, 0.16, 9.8], 2.1, 0.12);
    this.adicionarNoChao(caixa.scene.clone(), [12.5, 0.16, 9.45], 1.9, -0.08);
    this.personagens = [
      this.adicionarPersonagem(prefeito, [2.8, 0.18, 4.9], 1.9, 0.12, 'Wave'),
      this.adicionarPersonagem(operario, [4, 0.18, 4.6], 1.82, -0.3, 'Interact'),
    ];
    this.alvosNpc.push(...this.personagens);

    this.construirObra();
    this.construirEscolas(escolaCompacta.scene, escolaPatio.scene);
    this.construirCentroComunitario(predioA.scene.clone(), predioH.scene.clone());
    this.construirMobilidade(semaforo.scene, banco.scene, arbusto.scene);
    this.construirImprevisto(lixo.scene, lixeira.scene, torreAgua.scene);
    this.construirDestinoFinal(banco.scene, arbusto.scene);
    this.reiniciar();
  }

  prepararMissao(missionId: LearningMissionId) {
    this.posicionarPersonagens(missionId);
    if (missionId === 'urban_repair' && this.lixoProblema && urbanProblemRemains(this.decisoes)) {
      this.lixoProblema.visible = true;
    }
    if (this.destaque) {
      const [x, z] = MISSION_SCENE_LOCATIONS[missionId].highlight;
      this.destaque.position.set(x, 0.3, z);
      this.destaque.visible = true;
    }
    this.pulso = 1;
  }

  aplicarEscolha(escolha: string) {
    if (!this.decisoes.includes(escolha)) this.decisoes.push(escolha);

    switch (escolha) {
      case 'apartment_construction':
        this.mostrar(this.centroBasico, false);
        this.mostrar(this.centroCompleto, true);
        this.mostrar(this.barreiras, false);
        break;
      case 'hospital_construction':
        this.mostrar(this.escolaCompacta, true);
        this.mostrar(this.escolaPatio, false);
        break;
      case 'urban_repair':
        this.mostrar(this.semaforos, true);
        this.mostrar(this.lixoProblema, false);
        this.mostrar(this.coletaOrganizada, true);
        this.ritmoTransito = 0.72;
        break;
      case 'escola-compacta':
        this.mostrar(this.escolaCompacta, true);
        this.mostrar(this.escolaPatio, false);
        this.mostrar(this.barreiras, false);
        break;
      case 'escola-patio':
        this.mostrar(this.escolaCompacta, false);
        this.mostrar(this.escolaPatio, true);
        this.mostrar(this.barreiras, false);
        break;
      case 'centro-basico':
        this.mostrar(this.centroBasico, true);
        this.mostrar(this.centroCompleto, false);
        break;
      case 'centro-completo':
        this.mostrar(this.centroBasico, false);
        this.mostrar(this.centroCompleto, true);
        break;
      case 'semaforo':
        this.mostrar(this.semaforos, true);
        this.ritmoTransito = 0.75;
        break;
      case 'rua-calma':
        this.mostrar(this.ruaCalma, true);
        this.ritmoTransito = 0.58;
        break;
      case 'agua':
        this.mostrar(this.torreAgua, true);
        break;
      case 'limpeza':
        this.mostrar(this.lixoProblema, false);
        this.mostrar(this.coletaOrganizada, true);
        break;
      case 'laboratorio':
        this.mostrar(this.laboratorio, true);
        this.mostrar(this.celebracao, true);
        break;
      case 'biblioteca':
        this.mostrar(this.biblioteca, true);
        this.mostrar(this.celebracao, true);
        break;
    }

    this.pulso = 1;
    return this.estado();
  }

  reiniciar() {
    this.decisoes = [];
    this.ritmoTransito = 1;
    [
      this.escolaCompacta, this.escolaPatio, this.centroBasico, this.centroCompleto,
      this.semaforos, this.ruaCalma,
      this.lixoProblema, this.coletaOrganizada, this.torreAgua, this.laboratorio,
      this.biblioteca, this.celebracao,
    ].forEach((objeto) => this.mostrar(objeto, false));
    this.mostrar(this.barreiras, true);
    this.pulso = 1;
    return this.estado();
  }

  estado() {
    return { decisoes: [...this.decisoes], evolucoes: this.decisoes.length };
  }

  destacar() {
    if (this.destaque) this.destaque.visible = true;
    this.pulso = 1;
  }

  ocultarDestaque() {
    if (this.destaque) this.destaque.visible = false;
  }

  atualizar(dt: number) {
    this.tempo += dt;
    for (const mixer of this.mixers) mixer.update(dt);
    this.atualizarTransito(dt);

    if (this.destaque) {
      this.pulso = Math.max(0, this.pulso - dt * 0.42);
      const respiracao = 1 + Math.sin(this.tempo * 2.1) * 0.035;
      this.destaque.scale.setScalar(respiracao + this.pulso * 0.45);
      this.destaque.material.opacity = 0.25 + this.pulso * 0.55;
    }

    if (this.laboratorio?.visible) {
      this.laboratorio.rotation.y += dt * 0.55;
      this.laboratorio.position.y = 8.4 + Math.sin(this.tempo * 2) * 0.08;
    }

    if (this.celebracao?.visible) {
      this.celebracao.children.forEach((confete, indice) => {
        confete.rotation.x += dt * (0.8 + indice % 3);
        confete.rotation.y += dt * (1.2 + indice % 2);
        confete.position.y = 2.1 + (indice % 5) * 0.34 + Math.sin(this.tempo * 2 + indice) * 0.18;
      });
    }
  }

  private atualizarTransito(dt: number) {
    const faseSinal = this.tempo % 20;
    const horizontalAberta = faseSinal < 8;
    const verticalAberta = faseSinal >= 10 && faseSinal < 18;
    const cruzamentosHorizontais = [-22, 6.6, 25];
    const cruzamentosVerticais = [-17, 0.5, 18];
    const velocidadesAlvo = new Map<THREE.Object3D, number>();

    for (const veiculo of this.veiculos) {
      let velocidadeAlvo = veiculo.velocidade * this.ritmoTransito;
      const sinalAberto = veiculo.eixo === 'x' ? horizontalAberta : verticalAberta;
      if (!sinalAberto) {
        const cruzamentos = veiculo.eixo === 'x' ? cruzamentosHorizontais : cruzamentosVerticais;
        const posicao = veiculo.objeto.position[veiculo.eixo];
        const distancias = cruzamentos
          .map((cruzamento) => (cruzamento - posicao) * veiculo.sentido)
          .filter((distancia) => distancia > 2.7);
        const distanciaAteCentro = Math.min(...distancias);
        const distanciaAteFaixa = distanciaAteCentro - 2.7;
        if (distanciaAteFaixa < 8) {
          velocidadeAlvo = Math.min(
            velocidadeAlvo,
            veiculo.velocidade * THREE.MathUtils.clamp(distanciaAteFaixa / 6, 0, 1),
          );
        }
      }

      const extensao = veiculo.maximo - veiculo.minimo;
      let distanciaFrente = extensao;
      for (const outro of this.veiculos) {
        if (outro === veiculo || outro.faixa !== veiculo.faixa) continue;
        let distancia = (outro.objeto.position[outro.eixo] - veiculo.objeto.position[veiculo.eixo]) * veiculo.sentido;
        if (distancia <= 0) distancia += extensao;
        distanciaFrente = Math.min(distanciaFrente, distancia);
      }
      if (distanciaFrente < 7.2) {
        velocidadeAlvo = Math.min(
          velocidadeAlvo,
          veiculo.velocidade * THREE.MathUtils.clamp((distanciaFrente - 3.8) / 3.4, 0, 1),
        );
      }
      velocidadesAlvo.set(veiculo.objeto, velocidadeAlvo);
    }

    for (const veiculo of this.veiculos) {
      const velocidadeAlvo = velocidadesAlvo.get(veiculo.objeto) ?? 0;
      const resposta = velocidadeAlvo < veiculo.velocidadeAtual ? 5.2 : 1.35;
      veiculo.velocidadeAtual += THREE.MathUtils.clamp(
        velocidadeAlvo - veiculo.velocidadeAtual,
        -resposta * dt,
        resposta * dt,
      );
      veiculo.objeto.position[veiculo.eixo] += veiculo.velocidadeAtual * dt * veiculo.sentido;
      if (veiculo.objeto.position[veiculo.eixo] > veiculo.maximo) veiculo.objeto.position[veiculo.eixo] = veiculo.minimo;
      if (veiculo.objeto.position[veiculo.eixo] < veiculo.minimo) veiculo.objeto.position[veiculo.eixo] = veiculo.maximo;
    }
  }

  private mostrar(objeto: THREE.Object3D | null, visivel: boolean) {
    if (objeto) objeto.visible = visivel;
  }

  private posicionarPersonagens(missionId: LearningMissionId) {
    const destino = MISSION_SCENE_LOCATIONS[missionId].characters;
    this.personagens.forEach((personagem, personagemIndice) => {
      const [x, z, rotacaoY] = destino[personagemIndice] ?? destino[0];
      personagem.position.x = x;
      personagem.position.z = z;
      personagem.rotation.y = rotacaoY;
    });
  }

  private async carregar(loader: GLTFLoader, arquivo: string): Promise<GLTF> {
    const gltf = await loader.loadAsync(`${BASE}/${arquivo}`);
    gltf.scene.traverse((objeto) => {
      if (!(objeto instanceof THREE.Mesh)) return;
      objeto.castShadow = true;
      objeto.receiveShadow = true;
      const materiais = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
      for (const material of materiais) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.roughness = 0.86;
        material.metalness = 0;
      }
    });
    return gltf;
  }

  private adicionarNoChao(
    objeto: THREE.Object3D,
    posicao: [number, number, number],
    escala: number,
    rotacaoY = 0,
    pai: THREE.Object3D = this.grupo,
  ) {
    objeto.position.set(posicao[0], 0, posicao[2]);
    objeto.scale.setScalar(escala);
    objeto.rotation.y = rotacaoY;
    objeto.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(objeto);
    objeto.position.y = posicao[1] - caixa.min.y;
    pai.add(objeto);
    return objeto;
  }

  private adicionarPersonagem(gltf: GLTF, posicao: [number, number, number], altura: number, rotacaoY: number, animacao: string) {
    const personagem = gltf.scene;
    personagem.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(personagem);
    const escala = altura / Math.max(0.01, caixa.max.y - caixa.min.y);
    this.adicionarNoChao(personagem, posicao, escala, rotacaoY);
    const mixer = new THREE.AnimationMixer(personagem);
    const clipe = THREE.AnimationClip.findByName(gltf.animations, animacao) ?? THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    if (clipe) mixer.clipAction(clipe).play();
    this.mixers.push(mixer);
    return personagem;
  }

  private construirBase() {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(80, 0.5, 80),
      new THREE.MeshStandardMaterial({ color: 0xa6a79f, roughness: 1 }),
    );
    base.position.y = -0.31;
    base.receiveShadow = true;
    this.grupo.add(base);

    const pisoUrbano = new THREE.MeshStandardMaterial({ color: 0xa8afa4, roughness: 1 });
    const terra = new THREE.MeshStandardMaterial({ color: 0xa87952, roughness: 1 });
    const quarteiroes: Array<[number, number, number, number, THREE.Material]> = [
      [-7.4, -8.4, 23.6, 7.4, pisoUrbano],
      [12.8, -6.6, 8.2, 11.2, pisoUrbano],
      [12.8, 7.8, 8.2, 9.6, pisoUrbano],
      [-14.4, 6.8, 5.7, 8.2, terra],
      [0.5, 7.5, 6.4, 8.1, terra],
      [18.2, -7.2, 7.1, 8.4, terra],
      [-32, -27, 9.2, 10.2, terra],
      [33, 9, 8.4, 9.2, terra],
      [16, 27, 10.4, 8.8, terra],
    ];
    for (const [x, z, largura, profundidade, material] of quarteiroes) {
      const lote = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.08, profundidade), material);
      lote.position.set(x, -0.01, z);
      lote.receiveShadow = true;
      this.grupo.add(lote);
    }

    this.construirCanteiro(-14.4, 6.8, 5.7, 8.2, 0.15);
    this.construirCanteiro(0.5, 7.5, 6.4, 8.1, -0.08);
    this.construirCanteiro(18.2, -7.2, 7.1, 8.4, 0.08);
    this.construirCanteiro(-32, -27, 9.2, 10.2, -0.06);
    this.construirCanteiro(33, 9, 8.4, 9.2, 0.1);
    this.construirCanteiro(16, 27, 10.4, 8.8, -0.08);
  }

  private construirLuzes() {
    const ceu = new THREE.HemisphereLight(0xe8f7ff, 0x6c7c74, 1.8);
    const sol = new THREE.DirectionalLight(0xffdfac, 2.55);
    sol.position.set(-18, 28, 22);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { near: 1, far: 70, left: -23, right: 23, top: 23, bottom: -18 });
    sol.shadow.bias = -0.0008;
    sol.target.position.set(1, 1.5, 0);
    this.grupo.add(ceu, sol, sol.target);
  }

  private construirRuas() {
    const ruas = new THREE.Group();
    ruas.name = 'malha-viaria-continua';
    const asfalto = new THREE.MeshStandardMaterial({ color: 0x485456, roughness: 0.96 });
    const calcada = new THREE.MeshStandardMaterial({ color: 0x9da69f, roughness: 1 });
    const amarelo = new THREE.MeshStandardMaterial({ color: 0xe8bd43, roughness: 0.82 });
    const branco = new THREE.MeshStandardMaterial({ color: 0xf3f0df, roughness: 0.9 });

    const horizontais = [-17, 0.5, 18];
    const verticais = [-22, 6.6, 25];
    for (const z of horizontais) {
      ruas.add(this.criarPlaca(80, 5.8, calcada, 0, 0.04, z));
      ruas.add(this.criarPlaca(80, 4.4, asfalto, 0, 0.1, z));
    }
    for (const x of verticais) {
      ruas.add(this.criarPlaca(5.8, 80, calcada, x, 0.045, 0));
      ruas.add(this.criarPlaca(4.4, 80, asfalto, x, 0.105, 0));
    }

    const segmentosX: Array<[number, number]> = [[-39, -24.9], [-19.1, 3.7], [9.5, 22.1], [27.9, 39]];
    const segmentosZ: Array<[number, number]> = [[-39, -19.9], [-14.1, -2.4], [3.4, 15.1], [20.9, 39]];
    for (const z of horizontais) {
      for (const [inicio, fim] of segmentosX) {
        for (const margem of [-2.12, 2.12]) {
          ruas.add(this.criarPlaca(fim - inicio, 0.09, amarelo, (inicio + fim) / 2, 0.18, z + margem));
        }
      }
      for (let x = -38; x <= 38; x += 1.8) {
        if (verticais.some((vertical) => Math.abs(x - vertical) < 3.2)) continue;
        ruas.add(this.criarPlaca(0.9, 0.08, branco, x, 0.19, z));
      }
    }
    for (const x of verticais) {
      for (const [inicio, fim] of segmentosZ) {
        for (const margem of [-2.12, 2.12]) {
          ruas.add(this.criarPlaca(0.09, fim - inicio, amarelo, x + margem, 0.185, (inicio + fim) / 2));
        }
      }
      for (let z = -38; z <= 38; z += 1.8) {
        if (horizontais.some((horizontal) => Math.abs(z - horizontal) < 3.2)) continue;
        ruas.add(this.criarPlaca(0.08, 0.9, branco, x, 0.195, z));
      }
    }

    const travessiasHorizontal = [
      { x: -18.2, z: 0.5 },
      { x: 2.7, z: 0.5 },
    ];
    for (const travessia of travessiasHorizontal) {
      for (let deslocamento = -1.44; deslocamento <= 1.44; deslocamento += 0.48) {
        ruas.add(this.criarPlaca(0.25, 3.45, branco, travessia.x + deslocamento, 0.205, travessia.z));
      }
    }
    const travessiasVertical = [
      { x: 6.6, z: -13.2 },
      { x: 6.6, z: 4.3 },
    ];
    for (const travessia of travessiasVertical) {
      for (let deslocamento = -1.44; deslocamento <= 1.44; deslocamento += 0.48) {
        ruas.add(this.criarPlaca(3.45, 0.25, branco, travessia.x, 0.21, travessia.z + deslocamento));
      }
    }
    this.grupo.add(ruas);
  }

  private criarPlaca(
    largura: number,
    profundidade: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const placa = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.08, profundidade), material);
    placa.position.set(x, y, z);
    placa.receiveShadow = true;
    return placa;
  }

  private construirCanteiro(x: number, z: number, largura: number, profundidade: number, rotacao: number) {
    const canteiro = new THREE.Group();
    canteiro.position.set(x, 0.08, z);
    canteiro.rotation.y = rotacao;
    const concreto = new THREE.MeshStandardMaterial({ color: 0x66736f, roughness: 0.96 });
    const tijolo = new THREE.MeshStandardMaterial({ color: 0xc57246, roughness: 0.92 });
    const madeira = new THREE.MeshStandardMaterial({ color: 0x8a613e, roughness: 1 });
    const laranja = new THREE.MeshStandardMaterial({ color: 0xf28c3c, roughness: 0.82 });

    const larguraFundacao = largura * 0.64;
    const profundidadeFundacao = profundidade * 0.58;
    for (const pz of [-profundidadeFundacao / 2, profundidadeFundacao / 2]) {
      canteiro.add(this.criarPlaca(larguraFundacao, 0.24, concreto, 0, 0.07, pz));
    }
    for (const px of [-larguraFundacao / 2, 0, larguraFundacao / 2]) {
      canteiro.add(this.criarPlaca(0.24, profundidadeFundacao, concreto, px, 0.085, 0));
    }
    const meiaLargura = largura * 0.24;
    const meiaProfundidade = profundidade * 0.2;
    for (const px of [-meiaLargura, meiaLargura]) {
      for (const pz of [-meiaProfundidade, meiaProfundidade]) {
        const pilar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.7, 0.22), concreto);
        pilar.position.set(px, 0.96, pz);
        pilar.castShadow = true;
        canteiro.add(pilar);
      }
    }
    for (let indice = 0; indice < 4; indice++) {
      const bloco = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.42), tijolo);
      bloco.position.set(-largura * 0.33 + (indice % 2) * 0.66, 0.26 + Math.floor(indice / 2) * 0.33, profundidade * 0.31);
      bloco.castShadow = true;
      canteiro.add(bloco);
    }
    const vigas = new THREE.Group();
    for (let indice = 0; indice < 3; indice++) {
      const viga = new THREE.Mesh(new THREE.BoxGeometry(largura * 0.36, 0.14, 0.14), madeira);
      viga.position.set(largura * 0.23, 0.2 + indice * 0.15, profundidade * 0.31);
      viga.rotation.y = 0.08 * indice;
      viga.castShadow = true;
      vigas.add(viga);
    }
    canteiro.add(vigas);
    for (let indice = -2; indice <= 2; indice++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 10), laranja);
      cone.position.set(indice * 0.72, 0.29, -profundidade * 0.43);
      cone.castShadow = true;
      canteiro.add(cone);
    }
    this.grupo.add(canteiro);
  }

  private construirBairro(predios: THREE.Object3D[]) {
    const lotes: Array<[number, number, number, number]> = [
      [-13, -8.4, 2.15, 0], [-8, -8.6, 2.05, 0], [-3, -8.4, 2.25, 0],
      [2, -8.5, 2.1, 0], [11, -8.4, 2.2, 0], [-14, -2.8, 2.05, Math.PI / 2],
      [10.8, 8.7, 2.15, Math.PI], [14.3, 4.8, 1.9, -Math.PI / 2],
      [-16.5, -27, 2.1, 0], [-10.5, -27.2, 2, 0], [-4.2, -27, 2.2, 0],
      [1.3, -27.1, 1.9, 0], [-16.5, -34, 2, 0], [-10.5, -34.2, 2.15, 0],
      [-4.2, -34, 1.95, 0], [1.3, -34.1, 2.1, 0],
      [12.3, -27, 2.15, 0], [19, -27.2, 2, 0], [12.3, -34, 2, 0], [19, -34.1, 2.15, 0],
      [31.2, -27, 2.2, 0], [36.4, -26.8, 1.9, 0], [31.2, -34, 2, 0], [36.4, -34, 2.1, 0],
      [-32, -11.4, 2.15, Math.PI / 2], [-32, -5.2, 2, Math.PI / 2],
      [33, -11.4, 2.2, -Math.PI / 2], [33, -5.2, 1.95, -Math.PI / 2],
      [-32, 5.6, 2.1, Math.PI / 2], [-32, 12, 2, Math.PI / 2],
      [19, 9.5, 2.05, Math.PI / 2], [15.5, 13, 1.9, 0],
      [-35, 27, 2.1, Math.PI], [-29.5, 27, 2, Math.PI],
      [-35, 34, 2, Math.PI], [-29.5, 34, 2.15, Math.PI],
      [-16.2, 27, 2, Math.PI], [-9.7, 27.2, 2.2, Math.PI], [-3.2, 27, 1.95, Math.PI],
      [-16.2, 34, 2.15, Math.PI], [-9.7, 34.2, 1.95, Math.PI], [-3.2, 34, 2.1, Math.PI],
      [12.8, 35, 2, Math.PI], [19.2, 35, 2.1, Math.PI],
      [31.5, 27, 2.1, Math.PI], [36.5, 26.8, 1.9, Math.PI],
      [31.5, 34, 2, Math.PI], [36.5, 34, 2.15, Math.PI],
    ];
    lotes.forEach(([x, z, escala, rotacao], indice) => {
      this.adicionarNoChao(predios[indice % predios.length].clone(), [x, 0.02, z], escala, rotacao);
    });
  }

  private construirArborizacao() {
    const posicoes: Array<[number, number, number]> = [
      [-18, 0.12, -13], [-13, 0.12, -13], [-7, 0.12, -13], [-1, 0.12, -13],
      [11, 0.12, -13], [16.5, 0.12, -13], [20.5, 0.12, -13],
      [-18, 0.12, -3.8], [-12, 0.12, -3.8], [-5, 0.12, -3.8], [1.5, 0.12, -3.8],
      [11, 0.12, -3.8], [17, 0.12, -3.8], [20.5, 0.12, -3.8],
      [-18, 0.12, 4], [-12, 0.12, 4], [-3, 0.12, 4], [11, 0.12, 4], [18.5, 0.12, 4],
      [-18, 0.12, 14], [-12, 0.12, 14], [-4, 0.12, 14], [11, 0.12, 14], [19, 0.12, 14],
      [-36, 0.12, -21], [-29, 0.12, -21], [-17, 0.12, -21], [-10, 0.12, -21],
      [-2, 0.12, -21], [12, 0.12, -21], [20, 0.12, -21], [30, 0.12, -21], [36, 0.12, -21],
      [-36, 0.12, 21.8], [-29, 0.12, 21.8], [-17, 0.12, 21.8], [-10, 0.12, 21.8],
      [-2, 0.12, 21.8], [12, 0.12, 21.8], [20, 0.12, 21.8], [30, 0.12, 21.8], [36, 0.12, 21.8],
    ];
    posicoes.forEach(([x, y, z], indice) => {
      const arvore = this.criarArvore(0.82 + (indice % 4) * 0.08);
      arvore.position.set(x, y, z);
      this.grupo.add(arvore);
    });
  }

  private criarArvore(escala: number) {
    const arvore = new THREE.Group();
    const tronco = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 1.05, 7),
      new THREE.MeshStandardMaterial({ color: 0x795238, roughness: 1 }),
    );
    tronco.position.y = 0.52;
    const copaEscura = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 1),
      new THREE.MeshStandardMaterial({ color: 0x287c59, roughness: 0.94 }),
    );
    copaEscura.position.set(-0.18, 1.35, 0);
    const copaClara = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.52, 1),
      new THREE.MeshStandardMaterial({ color: 0x52a85f, roughness: 0.94 }),
    );
    copaClara.position.set(0.3, 1.48, 0.08);
    arvore.add(tronco, copaEscura, copaClara);
    arvore.scale.setScalar(escala);
    arvore.traverse((objeto) => {
      if (!(objeto instanceof THREE.Mesh)) return;
      objeto.castShadow = true;
      objeto.receiveShadow = true;
    });
    return arvore;
  }

  private construirTransito(taxi: THREE.Object3D, sedan: THREE.Object3D, hatchback: THREE.Object3D) {
    const modelos = [taxi, sedan, hatchback];
    const configuracoes: Array<{
      modelo: number;
      eixo: 'x' | 'z';
      faixa: string;
      lateral: number;
      posicao: number;
      sentido: 1 | -1;
      velocidade: number;
    }> = [
      { modelo: 0, eixo: 'x', faixa: 'central-leste', lateral: -0.62, posicao: -28, sentido: 1, velocidade: 2.15 },
      { modelo: 1, eixo: 'x', faixa: 'central-leste', lateral: -0.62, posicao: -4, sentido: 1, velocidade: 2.15 },
      { modelo: 2, eixo: 'x', faixa: 'central-leste', lateral: -0.62, posicao: 20, sentido: 1, velocidade: 2.15 },
      { modelo: 1, eixo: 'x', faixa: 'central-oeste', lateral: 1.62, posicao: -20, sentido: -1, velocidade: 1.9 },
      { modelo: 2, eixo: 'x', faixa: 'central-oeste', lateral: 1.62, posicao: 4, sentido: -1, velocidade: 1.9 },
      { modelo: 0, eixo: 'x', faixa: 'central-oeste', lateral: 1.62, posicao: 28, sentido: -1, velocidade: 1.9 },
      { modelo: 2, eixo: 'x', faixa: 'norte-leste', lateral: -18.12, posicao: -24, sentido: 1, velocidade: 2 },
      { modelo: 0, eixo: 'x', faixa: 'norte-leste', lateral: -18.12, posicao: 18, sentido: 1, velocidade: 2 },
      { modelo: 0, eixo: 'x', faixa: 'norte-oeste', lateral: -15.88, posicao: -10, sentido: -1, velocidade: 1.8 },
      { modelo: 1, eixo: 'x', faixa: 'norte-oeste', lateral: -15.88, posicao: 30, sentido: -1, velocidade: 1.8 },
      { modelo: 2, eixo: 'z', faixa: 'central-sul', lateral: 7.72, posicao: -8, sentido: 1, velocidade: 1.75 },
      { modelo: 1, eixo: 'z', faixa: 'central-norte', lateral: 5.48, posicao: 10, sentido: -1, velocidade: 1.65 },
    ];

    this.veiculos = configuracoes.map((configuracao) => {
      const objeto = modelos[configuracao.modelo].clone();
      const posicao: [number, number, number] = configuracao.eixo === 'x'
        ? [configuracao.posicao, 0.18, configuracao.lateral]
        : [configuracao.lateral, 0.18, configuracao.posicao];
      const rotacao = configuracao.eixo === 'x'
        ? configuracao.sentido * Math.PI / 2
        : configuracao.sentido === 1 ? 0 : Math.PI;
      const carro = this.adicionarNoChao(objeto, posicao, 4.35, rotacao);
      return {
        objeto: carro,
        eixo: configuracao.eixo,
        faixa: configuracao.faixa,
        minimo: -38,
        maximo: 38,
        velocidade: configuracao.velocidade,
        velocidadeAtual: configuracao.velocidade,
        sentido: configuracao.sentido,
      };
    });
  }

  private construirObra() {
    const obra = new THREE.Group();
    obra.position.set(-8, 0.18, 7);
    const fundacao = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.22, 6.2),
      new THREE.MeshStandardMaterial({ color: 0x9a7250, roughness: 1 }),
    );
    fundacao.receiveShadow = true;
    fundacao.userData.projeto = true;
    this.alvosProjeto.push(fundacao);
    obra.add(fundacao);

    const barreiras = new THREE.Group();
    const laranja = new THREE.MeshStandardMaterial({ color: 0xf28c3c, roughness: 0.78 });
    for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 12), laranja);
      cone.position.set(x, 0.35, 3.25);
      barreiras.add(cone);
    }
    const placa = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.22, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffd566 }),
    );
    placa.position.set(0, 0.78, 3.2);
    barreiras.add(placa);
    obra.add(barreiras);
    this.barreiras = barreiras;

    this.destaque = new THREE.Mesh(
      new THREE.TorusGeometry(3.9, 0.07, 8, 72),
      new THREE.MeshBasicMaterial({ color: 0xffd566, transparent: true, opacity: 0.25 }),
    );
    this.destaque.rotation.x = Math.PI / 2;
    this.destaque.position.set(-8, 0.3, 7);
    this.grupo.add(this.destaque);
    this.grupo.add(obra);
  }

  private construirEscolas(compacta: THREE.Object3D, patio: THREE.Object3D) {
    const grupoCompacta = new THREE.Group();
    this.adicionarNoChao(compacta, [-8, 0.31, 6.2], 2.15, Math.PI, grupoCompacta);
    this.grupo.add(grupoCompacta);
    this.escolaCompacta = grupoCompacta;

    const grupoPatio = new THREE.Group();
    const blocosPatio = [patio, patio.clone(), patio.clone()];
    this.adicionarNoChao(blocosPatio[0], [-8, 0.31, 5.8], 2.8, Math.PI, grupoPatio);
    this.adicionarNoChao(blocosPatio[1], [-11.15, 0.31, 7], 2.15, Math.PI / 2, grupoPatio);
    this.adicionarNoChao(blocosPatio[2], [-4.85, 0.31, 7], 2.15, -Math.PI / 2, grupoPatio);
    const quadra = new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 0.07, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x78a866, roughness: 1 }),
    );
    quadra.position.set(-8, 0.34, 9.15);
    quadra.receiveShadow = true;
    grupoPatio.add(quadra);
    this.grupo.add(grupoPatio);
    this.escolaPatio = grupoPatio;
  }

  private construirCentroComunitario(basico: THREE.Object3D, completo: THREE.Object3D) {
    const grupoBasico = new THREE.Group();
    this.adicionarNoChao(basico, [14, 0.3, 2], 3.1, Math.PI, grupoBasico);
    this.grupo.add(grupoBasico);
    this.centroBasico = grupoBasico;

    const grupoCompleto = new THREE.Group();
    this.adicionarNoChao(completo, [14, 0.3, 1.4], 3.25, Math.PI, grupoCompleto);
    this.adicionarNoChao(completo.clone(), [11.5, 0.3, 3.2], 2.2, Math.PI / 2, grupoCompleto);
    this.adicionarNoChao(completo.clone(), [16.5, 0.3, 3.2], 2.2, -Math.PI / 2, grupoCompleto);
    this.grupo.add(grupoCompleto);
    this.centroCompleto = grupoCompleto;
  }

  private construirMobilidade(semaforo: THREE.Object3D, banco: THREE.Object3D, arbusto: THREE.Object3D) {
    const semaforosPermanentes = new THREE.Group();
    const pontosPermanentes: Array<[number, number, number]> = [
      [4.3, 2.75, Math.PI / 2], [8.9, -1.75, -Math.PI / 2],
      [4.3, -14.75, Math.PI / 2], [8.9, -19.25, -Math.PI / 2],
    ];
    pontosPermanentes.forEach(([x, z, rotacao]) => {
      this.adicionarNoChao(semaforo.clone(), [x, 0.1, z], 2.15, rotacao, semaforosPermanentes);
    });
    this.grupo.add(semaforosPermanentes);

    const semaforos = new THREE.Group();
    this.adicionarNoChao(semaforo, [-24.3, 0.1, 2.75], 2.25, Math.PI / 2, semaforos);
    this.adicionarNoChao(semaforo.clone(), [-19.7, 0.1, -1.75], 2.25, -Math.PI / 2, semaforos);
    this.grupo.add(semaforos);
    this.semaforos = semaforos;

    const ruaCalma = new THREE.Group();
    this.adicionarNoChao(banco, [-4.6, 0.1, 5.25], 2.2, Math.PI / 2, ruaCalma);
    this.adicionarNoChao(arbusto.clone(), [-5.35, 0.1, 5.2], 1.9, 0, ruaCalma);
    this.adicionarNoChao(arbusto.clone(), [-3.85, 0.1, 5.2], 1.9, 0, ruaCalma);
    this.grupo.add(ruaCalma);
    this.ruaCalma = ruaCalma;
  }

  private construirImprevisto(lixo: THREE.Object3D, lixeira: THREE.Object3D, torre: THREE.Object3D) {
    const problema = new THREE.Group();
    this.adicionarNoChao(lixo, [12.7, 0.12, 9.7], 2.4, 0.15, problema);
    this.adicionarNoChao(lixo.clone(), [13.2, 0.12, 9.2], 1.9, -0.35, problema);
    this.grupo.add(problema);
    this.lixoProblema = problema;

    const coleta = new THREE.Group();
    this.adicionarNoChao(lixeira, [12.9, 0.12, 9.4], 2.25, Math.PI, coleta);
    this.grupo.add(coleta);
    this.coletaOrganizada = coleta;
    this.torreAgua = this.adicionarNoChao(torre, [14, 0.08, -5.8], 2.1);
  }

  private construirDestinoFinal(banco: THREE.Object3D, arbusto: THREE.Object3D) {
    const laboratorio = new THREE.Group();
    laboratorio.position.set(-8, 8.4, 7);
    const nucleo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.24, 1),
      new THREE.MeshStandardMaterial({ color: 0x65e6d3, emissive: 0x168d82, emissiveIntensity: 2 }),
    );
    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x168d82 }),
    );
    anel.rotation.x = Math.PI / 2;
    laboratorio.add(nucleo, anel);
    this.grupo.add(laboratorio);
    this.laboratorio = laboratorio;

    const biblioteca = new THREE.Group();
    this.adicionarNoChao(banco.clone(), [-11.6, 0.1, 5], 2, Math.PI / 2, biblioteca);
    this.adicionarNoChao(banco.clone(), [-4.5, 0.1, 8.8], 2, Math.PI, biblioteca);
    this.adicionarNoChao(arbusto.clone(), [-11.2, 0.1, 8.8], 2, 0, biblioteca);
    this.grupo.add(biblioteca);
    this.biblioteca = biblioteca;

    const celebracao = new THREE.Group();
    const cores = [0xffd566, 0xf28c3c, 0x168d82, 0xffffff];
    for (let indice = 0; indice < 24; indice++) {
      const confete = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.15, 0.035),
        new THREE.MeshBasicMaterial({ color: cores[indice % cores.length] }),
      );
      const angulo = (indice / 24) * Math.PI * 2;
      const raio = 1.3 + (indice % 4) * 0.25;
      confete.position.set(-8 + Math.cos(angulo) * raio * 2, 2.1, 7 + Math.sin(angulo) * raio * 2);
      celebracao.add(confete);
    }
    this.grupo.add(celebracao);
    this.celebracao = celebracao;
  }
}
