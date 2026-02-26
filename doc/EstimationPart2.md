# Project Estimation part 2



Goal of this document is to compare actual effort and size of the project, vs the estimates made in task1.

## Computation of size

To compute the lines of code use cloc    
To install cloc:  
           `npm install -g cloc`   
On Windows, also a perl interpreter needs to be installed. You find it here https://strawberryperl.com/  
To run cloc  
           `cloc <directory containing ts files> --include-lang=TypeScript`  
As a result of cloc collect the *code* value (rightmost column of the result table)  
        

Compute two separate values of size  
-LOC of production code     `cloc <Geocontrol\src> --include-lang=TypeScript`  
-LOC of test code      `cloc <GeoControl\test> --include-lang=TypeScript`  


## Computation of effort 
From timesheet.md sum all effort spent, in **ALL** activities (task1, task2, task3) at the end of the project on June 7. Exclude task4
s
effort = (Requirement engineering) 24+7+30+20+ (Coding) 17+22+41+9+13+ (Unit testing) 16+40 + (Integration testing) 37+52+ (acceptance testing) 0.5 = 328,5

## Computation of productivity

productivity = ((LOC of production code)+ (LOC of test code)) / effort
productivty = (2297)+(9029)/328.5 = 11'326 / 328.5 = 34, 478

## Comparison

|                                        | Estimated (end of task 1) | Actual (june 7, end of task 3)|
| -------------------------------------------------------------------------------- | -------- |----|
| production code size | unknown  |2297| 
| test code size | unknown |9029| 
| total size  ||11326| 
| effort || 328.5|
| productivity  | 10 loc / hour |34.48 loc / hour|


Report, as estimate of effort, the value obtained via activity decomposition technique.


