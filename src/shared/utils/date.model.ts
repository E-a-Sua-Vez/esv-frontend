import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

export class DateModel {

  private dayjsObj: any;

  private readonly DATE_SEPARATOR = '-';

  constructor(dateAsString?: string) {
    dayjs.extend(utc);
    dayjs.extend(isSameOrAfter);
    this.dayjsObj = dayjs.utc(dateAsString);
  }

  private substract(numberOfUnits: number, units: string): DateModel {
    const newDayjsObj = this.dayjsObj.subtract(numberOfUnits, units);
    const dateAsString = newDayjsObj.toString();
    return new DateModel(dateAsString);
  }

  private add(numberOfUnits: number, units: string): DateModel {
    const newDayjsObj = this.dayjsObj.add(numberOfUnits, units);
    const dateAsString = newDayjsObj.toString();
    return new DateModel(dateAsString);
  }

  public substractDays(days: number): DateModel {
    return this.substract(days, 'days');
  }

  public addDays(days: number): DateModel {
    const newDayjsObj = this.dayjsObj.add(days, 'days');
    return new DateModel(newDayjsObj.toString());
  }

  public endOfMonth(): DateModel {
    const newDayjsObj = this.dayjsObj.endOf('month');
    return new DateModel(newDayjsObj.toString());
  }

  public substractMonths(months: number): DateModel {
    return this.substract(months, 'months');
  }

  public addMonths(numberOfMonthsToAdd: number): DateModel {
    return this.add(numberOfMonthsToAdd, 'months');
  }

  public toString(format = 'YYYY-MM-DD'): string {
    return this.dayjsObj.format(format).toString();
  }

  public isSameOrAfter(date: DateModel): boolean {
    const dateAsString = date.toString();
    const dayjsObj = dayjs.utc(dateAsString);
    return this.dayjsObj.isSameOrAfter(dayjsObj);
  }

  public daysDiff = (dateBefore: DateModel): number => this.dayjsObj.diff(dateBefore.dayjsObj, 'days');
  public monthsDiff = (dateBefore: DateModel): number => this.dayjsObj.diff(dateBefore.dayjsObj, 'months');
  public yearsDiff = (dateBefore: DateModel): number => this.dayjsObj.diff(dateBefore.dayjsObj, 'years');

  public setDateOfMonth(dayOfMonth: number): DateModel {
    const dateAsString = this.dayjsObj.date(dayOfMonth);
    return new DateModel(dateAsString);
  }

  public now(format = 'YYYY-MM-DD'): string {
    return dayjs().format(format);
  }

  // public add(date: string, days: number, unit: dayjs.OpUnitType, format = 'YYYY-MM-DD'): string {
  //   return dayjs(date).add(days, unit).format(format);
  // }

  public format(date: Date, format = 'YYYY-MM-DD'): string {
    return dayjs(date).format(format);
  }

  public transformToBusinessDay(date: string, format = 'YYYY-MM-DD'): string {
    // TODO: Holidays by country
    const day = dayjs(date).get('day');
    if (day === 0) return dayjs(date).add(1, 'day').format(format);
    if (day === 6) return dayjs(date).add(2, 'day').format(format);
    return dayjs(date).format(format);
  }

  public day(): string {
    const [, , day] = this.toString().split(this.DATE_SEPARATOR);
    if (!day) {
      throw new Error('error getting day from date');
    }
    return day;
  }

}
