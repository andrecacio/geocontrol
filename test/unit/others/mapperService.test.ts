import {
    createStatsDTO,
    createNetworkDTO,
    createGatewayDTO,
    createSensorDTO,
    mapNetworkDAOToDTO,
    mapGatewayDAOToDTO,
    mapSensorDAOToDTO,
    createMeasurementsDTO,
    mapMeasurementDAOToDTO,
    createMeasurementDTO,
    createErrorDTO,
    createTokenDTO,
    mapUserDAOToDTO,
    createUserDTO
  } from "@services/mapperService";
  
  import { NetworkDAO }  from "@dao/NetworkDAO";
  import { GatewayDAO }  from "@dao/GatewayDAO";
  import { SensorDAO }   from "@dao/SensorDAO";
import { UserType } from "@models/UserType";
  
  /* helpers */
  const makeSensorDAO = (mac = "S1"): SensorDAO =>
    ({ macAddress: mac, name: "S", description: null, variable: null, unit: null } as any);
  
  const makeGatewayDAO = (mac = "GW1", sensors: SensorDAO[] = []) =>
    ({ macAddress: mac, name: "G", description: undefined, sensors } as any as GatewayDAO);
  
  const makeNetworkDAO = (code = "net", gws: GatewayDAO[] = []) =>
    ({ code, name: "Net", description: "Desc", gateways: gws } as any as NetworkDAO);
  
  /*  tests */
  describe("mapperService – DTO helpers", () => {

    it("mapGatewayDAOToDTO rimuove `sensors` se `sensors` è undefined o array vuoto", () => {
      
      const fakeGW1: any = { macAddress: "GW_NO_SENS", name: "G_NoSens", description: "D_NoSens" };
      const dto1 = mapGatewayDAOToDTO(fakeGW1 as GatewayDAO);
      expect(dto1).toEqual({ macAddress: "GW_NO_SENS", name: "G_NoSens", description: "D_NoSens" });
  
     
      const fakeGW2: any = { macAddress: "GW_EMPTY", name: "G_Empty", description: "D_Empty", sensors: [] };
      const dto2 = mapGatewayDAOToDTO(fakeGW2 as GatewayDAO);
     
      expect(dto2).toEqual({ macAddress: "GW_EMPTY", name: "G_Empty", description: "D_Empty" });
    });
  
    it("mapNetworkDAOToDTO rimuove `gateways` se `gateways` è undefined o array vuoto", () => {
      
      const fakeNet1: any = { code: "NET_NO_GW", name: "N_NoGW", description: "D_NoGW" };
      const dto1 = mapNetworkDAOToDTO(fakeNet1 as NetworkDAO);
      expect(dto1).toEqual({ code: "NET_NO_GW", name: "N_NoGW", description: "D_NoGW" });
  
      
      const fakeNet2: any = { code: "NET_EMPTY", name: "N_Empty", description: "D_Empty", gateways: [] };
      const dto2 = mapNetworkDAOToDTO(fakeNet2 as NetworkDAO);
      
      expect(dto2).toEqual({ code: "NET_EMPTY", name: "N_Empty", description: "D_Empty" });
    });


    it("createErrorDTO rimuove name/message se undefined/null", () => {
      // caso pieno
      const full = createErrorDTO(404, "Not found", "NotFoundError");
      expect(full).toEqual({ code: 404, message: "Not found", name: "NotFoundError" });
  
      // caso con solo code: gli altri due devono sparire
      const onlyCode = createErrorDTO(500, undefined, undefined);
      expect(onlyCode).toEqual({ code: 500 });
    });
  
    it("createTokenDTO restituisce oggetto con solo token", () => {
      const dto = createTokenDTO("abc123");
      expect(dto).toEqual({ token: "abc123" });
    });


    it("createUserDTO rimuove password se undefined", () => {
      const dto = createUserDTO("alice", UserType.Viewer);
      expect(dto).toEqual({ username: "alice", type: UserType.Viewer });
    });
  
    it("createUserDTO mantiene password se presente", () => {
      const dto = createUserDTO("bob", UserType.Admin, "secret");
      expect(dto).toEqual({ username: "bob", type: UserType.Admin, password: "secret" });
    });
  
    it("mapUserDAOToDTO converte correttamente UserDAO→UserDTO", () => {
      // simuliamo un DAO con campi superflui
      const fakeUserDAO: any = { username: "charlie", type: UserType.Operator, password: "ignored" };
      const dto = mapUserDAOToDTO(fakeUserDAO as any);
      expect(dto).toEqual({ username: "charlie", type: UserType.Operator });
    });


    /* ------------------- removeNullAttributes via create* ------------------ */
    it("createSensorDTO rimuove campi null e array vuoti", () => {
      const dto = createSensorDTO("S1");                
      expect(dto).toMatchObject({ macAddress: "S1" });        // niente name/desc
    });
  
    it("createGatewayDTO non include sensors se array vuoto", () => {
      const dto = createGatewayDTO("GW1", "G", "D", []);   // sensors vuoto
      expect(dto).not.toHaveProperty("sensors");
    });
  
    it("createNetworkDTO include gateways solo se non vuoto", () => {
      const dtoEmpty = createNetworkDTO("net");
      expect(dtoEmpty).not.toHaveProperty("gateways");
  
      const dtoFilled = createNetworkDTO("net", "N", "D", [createGatewayDTO("GW")]);
      expect(dtoFilled.gateways!.length).toBe(1);
    });
  
    /* ----------------------- StatsDTO edge-cases --------------------------- */
    it("createStatsDTO lascia undefined le date se non passate", () => {
      const stats = createStatsDTO(0, 0, 0, 0);
      expect(stats).not.toHaveProperty("startDate");
      expect(stats).not.toHaveProperty("endDate");
    });

    it("mapSensorDAOToDTO copia i campi corretti", () => {
      const dao = makeSensorDAO("S1");
      const dto = mapSensorDAOToDTO(dao);
      expect(dto).toMatchObject({ macAddress: "S1" });
    });
  
    it("mapGatewayDAOToDTO converte anche sensors", () => {
      const dao = makeGatewayDAO("GW1", [makeSensorDAO("S1")]);
      const dto = mapGatewayDAOToDTO(dao);
      expect(dto.sensors!.length).toBe(1);
      expect(dto.sensors![0].macAddress).toBe("S1");
    });


  
    it("mapNetworkDAOToDTO converte gateways e sensors ricorsivamente", () => {
      const netDao = makeNetworkDAO("net1", [
        makeGatewayDAO("GW", [makeSensorDAO("S1"), makeSensorDAO("S2")])
      ]);
      const dto = mapNetworkDAOToDTO(netDao);
  
      expect(dto.code).toBe("net1");
      expect(dto.gateways!.length).toBe(1);
      expect(dto.gateways![0].sensors!.map(s => s.macAddress).sort())
        .toEqual(["S1", "S2"]);
    });



    it("createMeasurementDTO rimuove isOutlier se undefined", () => {
      const date = new Date("2025-06-01T12:00:00Z");
      const dto = createMeasurementDTO(date, 42);
      expect(dto).toEqual({ createdAt: date, value: 42 });
    });
  
    it("mapMeasurementDAOToDTO converte correttamente MeasurementDAO→MeasurementDTO", () => {
      const fakeMeasDAO: any = {
        createdAt: new Date("2025-07-01T08:00:00Z"),
        value: 3.14,
        isOutlier: true
      };
      const dto = mapMeasurementDAOToDTO(fakeMeasDAO as any);
      expect(dto).toEqual({ createdAt: fakeMeasDAO.createdAt, value: 3.14, isOutlier: true });
    });
  
    it("createMeasurementsDTO non include stats/measurements se undefined/array vuoto", () => {
      const dto1 = createMeasurementsDTO("MAC1");
      expect(dto1).toEqual({ sensorMacAddress: "MAC1" });
  
      const dto2 = createMeasurementsDTO("MAC2", undefined, []);
      expect(dto2).toEqual({ sensorMacAddress: "MAC2" });
    });
  
    it("createMeasurementsDTO include stats e measurements quando presenti", () => {
      const fakeStat: any = {
        mean: 10,
        variance: 5,
        upperThreshold: 15,
        lowerThreshold: 2
      };
      const fakeMeasA: any = { createdAt: new Date("2025-08-01T00:00:00Z"), value: 1 };
      const fakeMeasB: any = { createdAt: new Date("2025-08-01T01:00:00Z"), value: 2, isOutlier: false };
  
      const dto = createMeasurementsDTO("MACX", fakeStat, [fakeMeasA as any, fakeMeasB as any]);
      expect(dto).toEqual({
        sensorMacAddress: "MACX",
        stats: { mean: 10, variance: 5, upperThreshold: 15, lowerThreshold: 2 },
        measurements: [
          { createdAt: fakeMeasA.createdAt, value: 1 },
          { createdAt: fakeMeasB.createdAt, value: 2, isOutlier: false }
        ]
      });
    });

    it("createMeasurementDTO rimuove isOutlier se undefined", () => {
      const date = new Date("2025-06-01T12:00:00Z");
      const dto = createMeasurementDTO(date, 42);
      expect(dto).toEqual({ createdAt: date, value: 42 });
    });
  
    it("mapMeasurementDAOToDTO converte correttamente MeasurementDAO→MeasurementDTO", () => {
      const fakeMeasDAO: any = {
        createdAt: new Date("2025-07-01T08:00:00Z"),
        value: 3.14,
        isOutlier: true
      };
      const dto = mapMeasurementDAOToDTO(fakeMeasDAO as any);
      expect(dto).toEqual({ createdAt: fakeMeasDAO.createdAt, value: 3.14, isOutlier: true });
    });
  
    it("createMeasurementsDTO non include stats/measurements se undefined/array vuoto", () => {
      const dto1 = createMeasurementsDTO("MAC1");
      expect(dto1).toEqual({ sensorMacAddress: "MAC1" });
  
      const dto2 = createMeasurementsDTO("MAC2", undefined, []);
      expect(dto2).toEqual({ sensorMacAddress: "MAC2" });
    });
  
    it("createMeasurementsDTO include stats e measurements quando presenti", () => {
      const fakeStat: any = {
        mean: 10,
        variance: 5,
        upperThreshold: 15,
        lowerThreshold: 2
      };
      const fakeMeasA: any = { createdAt: new Date("2025-08-01T00:00:00Z"), value: 1 };
      const fakeMeasB: any = { createdAt: new Date("2025-08-01T01:00:00Z"), value: 2, isOutlier: false };
  
      const dto = createMeasurementsDTO("MACX", fakeStat, [fakeMeasA as any, fakeMeasB as any]);
      expect(dto).toEqual({
        sensorMacAddress: "MACX",
        stats: { mean: 10, variance: 5, upperThreshold: 15, lowerThreshold: 2 },
        measurements: [
          { createdAt: fakeMeasA.createdAt, value: 1 },
          { createdAt: fakeMeasB.createdAt, value: 2, isOutlier: false }
        ]
      });     
  });


});
  