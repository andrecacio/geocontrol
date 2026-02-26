import {
    findOrThrowNotFound,
    throwConflictIfFound,
    parseISODateParamToUTC,
    parseStringArrayParam
  } from "@utils";
  import { ConflictError } from "@errors/ConflictError";
  import { NotFoundError } from "@errors/NotFoundError";
  
  describe("utils helper functions", () => {
   
    it("findOrThrowNotFound restituisce oggetto se presente", () => {
      const res = findOrThrowNotFound([1, 2], x => x === 2, "missing");
      expect(res).toBe(2);
    });
  
    it("findOrThrowNotFound lancia NotFoundError se assente", () => {
      expect(() => findOrThrowNotFound([], () => true, "err")).toThrow(NotFoundError);
    });
  
    it("throwConflictIfFound NON lancia se predicate false", () => {
      expect(() => throwConflictIfFound([1], () => false, "dup")).not.toThrow();
    });
  
    it("throwConflictIfFound lancia ConflictError se predicate true", () => {
      expect(() => throwConflictIfFound([1], () => true, "dup")).toThrow(ConflictError);
    });
  
    
    it("parseISODateParamToUTC ritorna Date valida o undefined", () => {
      const d = parseISODateParamToUTC("2024-01-01T12:00:00Z");
      expect(d).toBeInstanceOf(Date);
      expect(parseISODateParamToUTC("not-a-date")).toBeUndefined();
    });
  
    /* ---------------------------- string array --------------------------- */
    it("parseStringArrayParam gestisce stringa, array e undefined", () => {
      expect(parseStringArrayParam("a , b, c")).toEqual(["a", "b", "c"]);
      expect(parseStringArrayParam(["x", " y ", ""])).toEqual(["x", "y"]);
      expect(parseStringArrayParam(["x", " y ", 2])).toEqual(["x", "y"]);
      expect(parseStringArrayParam(123)).toBeUndefined();
    });

    it("parseISODateParamToUTC ritorna Date valida o undefined", () => {
        const d = parseISODateParamToUTC("2024-01-01T12:00:00Z");
        expect(d).toBeInstanceOf(Date);
      
        expect(parseISODateParamToUTC("not-a-date")).toBeUndefined();
      
       
        expect(parseISODateParamToUTC(123 as any)).toBeUndefined();
      });
  });
  